#include <gcode.h>

String gCode = "";
bool repeatMode = false;
bool smoothingEnabled = false;
float smoothingFactor = 0.3;  // 0.0 = no smoothing, 1.0 = max smoothing

String originalGCode = "";    // Store original gcode for repeat mode

// Position history for smoothing (for future expansion)
#define SMOOTHING_BUFFER_SIZE 10
Position positionHistory[SMOOTHING_BUFFER_SIZE];
int historyIndex = 0;
int historyCount = 0;

// Last smoothed position (for exponential smoothing)
Position lastSmoothedPos = {0, 0};
bool hasLastSmoothedPos = false;

Position smoothedPosition(const Position &newPos) {
    if (!smoothingEnabled) {
        hasLastSmoothedPos = false;
        return newPos;
    }
    
    // Add new position to buffer
    positionHistory[historyIndex] = newPos;
    historyIndex = (historyIndex + 1) % SMOOTHING_BUFFER_SIZE;
    if (historyCount < SMOOTHING_BUFFER_SIZE) {
        historyCount++;
    }
    
    // Use exponential smoothing (low-pass filter)
    // smoothingFactor: 0 = no smoothing (use new), 1 = max smoothing (use old)
    // For motion smoothing, we want low values like 0.1-0.3
    
    Position smoothed;
    
    if (!hasLastSmoothedPos) {
        // First position - just use raw position
        smoothed = newPos;
    } else {
        // Exponential smoothing: smooth = new * alpha + old * (1 - alpha)
        // Higher smoothingFactor = more smoothing (slower response)
        float alpha = 1.0 - smoothingFactor;  // Invert so higher factor = more smoothing
        alpha = constrain(alpha, 0.1f, 1.0f); // Ensure some responsiveness
        
        smoothed.x = newPos.x * alpha + lastSmoothedPos.x * (1.0f - alpha);
        smoothed.y = newPos.y * alpha + lastSmoothedPos.y * (1.0f - alpha);
    }
    
    lastSmoothedPos = smoothed;
    hasLastSmoothedPos = true;
    
    return smoothed;
}

GCodeLine parseGCodeLine(const String &line)
{
    GCodeLine gcode;
    char lineBuffer[line.length() + 1];
    line.toCharArray(lineBuffer, line.length() + 1);

    char* token = strtok(lineBuffer, " ");
    if (token != nullptr) {
        gcode.cmd = token;
    }

    while ((token = strtok(nullptr, " ")) != nullptr) {
        String param(token);
        if (param.length() > 1) {
            String key = param.substring(0, 1);
            String valueStr = param.substring(1);
            gcode.params[key] = valueStr.toFloat();
        }
    }

    return gcode;
}

void executeLine(GCodeLine &gline)
{
    if (gline.cmd == "G1")
    {
        Position pos;
        pos.x = gline.params["X"];
        pos.y = gline.params["Y"];

        // Apply smoothing if enabled
        if (smoothingEnabled) {
            pos = smoothedPosition(pos);
        }

        Serial.printf("G1: Linear move to X: %.2f, Y: %.2f\n", pos.x, pos.y);
        linearMove(pos);
    }
    else if(gline.cmd == "G2" || gline.cmd == "G3") {
        Position center;
        center.x = gline.params["I"];
        center.y = gline.params["J"];

        Position end;
        end.x = gline.params["X"];
        end.y = gline.params["Y"];

        bool clockwise = gline.cmd == "G2";

        Serial.printf("%s: Arc move to X: %.2f, Y: %.2f, I: %.2f, J: %.2f\n", gline.cmd, end.x, end.y, center.x, center.y);
        arcMove(center, clockwise, &end);
    }
    else if (gline.cmd == "G28")
    {
        Serial.println("G28: Homing XY");
        homeXY();
    }
    else if (gline.cmd == "M3")
    {
        Serial.println("M3: Lower tool");
        enableTool();
    }
    else if (gline.cmd == "M5")
    {
        Serial.println("M5: Raise tool");
        enableTool(false);
    }
    else if (gline.cmd == "M999") {
        Serial.println("M999: Restarting ESP...");
        ESP.restart();
    }
    else if(gline.cmd == "M203") {
        float newSpeed = gline.params["X"];
        Serial.printf("M203: Setting speed to %.2f\n", newSpeed);
        setSpeed(newSpeed);
    }
    else {
        Serial.printf("Unknown command: %s\n", gline.cmd.c_str());
    }
}

// Public methods
void setGCode(String newGCode)
{
    gCode = newGCode;
    if (repeatMode) {
        originalGCode = newGCode;
    }
}

void setRepeatMode(bool enabled)
{
    repeatMode = enabled;
    if (enabled && !gCode.isEmpty()) {
        originalGCode = gCode;
    }
}

bool getRepeatMode()
{
    return repeatMode;
}

void setSmoothingEnabled(bool enabled)
{
    smoothingEnabled = enabled;
    if (!enabled) {
        historyCount = 0;
        historyIndex = 0;
    }
}

bool getSmoothingEnabled()
{
    return smoothingEnabled;
}

void setSmoothingFactor(float factor)
{
    smoothingFactor = constrain(factor, 0.0, 1.0);
}

float getSmoothingFactor()
{
    return smoothingFactor;
}

void processGCode(String &code)
{
    code = gCode;
}

void machineLoop()
{
    if (isBusy())
        return;

    // Handle repeat mode - restart gcode when finished
    if (repeatMode && gCode.isEmpty() && !originalGCode.isEmpty()) {
        Serial.println("Repeat mode: Restarting gcode from beginning");
        gCode = originalGCode;
        homeXY();
        return;
    }

    if (gCode.isEmpty())
        return;

    int lineEnd = gCode.indexOf('\n');

    String line = (lineEnd == -1) ? gCode : gCode.substring(0, lineEnd);
    gCode = (lineEnd == -1) ? "" : gCode.substring(lineEnd + 1);

    line.trim();

    if (line.isEmpty())
        return;

    GCodeLine gline = parseGCodeLine(line);
    executeLine(gline);
}
