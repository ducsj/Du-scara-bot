#include <Arduino.h>
#include <WiFiManager.h>
#include <ESPAsyncWebServer.h>
#include <AsyncJson.h>
#include <ArduinoJson.h>
#include <ESPmDNS.h>

// Own libraries
#include <config.h>
#include <gcode.h>

// Website
#include <web/index_gz.h>

// Local domain definition
const char* LOCAL_DOMAIN = "draw.local";

// WiFi and server setup
AsyncWebServer server(80);

// LED states
int ledR = 0, ledG = 0, ledB = 0;
bool ledEnabled = false;

// Buzzer state
bool buzzerEnabled = false;

void setup()
{
  Serial.begin(115200);
  
  // Initialize LED and buzzer pins
  pinMode(ledPin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);
  digitalWrite(ledPin, LOW);  // LED off
  digitalWrite(buzzerPin, LOW);  // Buzzer off
  
  servoLift.attach(liftServoPin);
  servoLeft.attach(servoLeftPin);
  servoRight.attach(servoRightPin);

  // Initialize WiFi in AP mode for first-time setup
  Serial.println("Starting WiFi AP mode...");
  WiFi.mode(WIFI_AP);
  bool apStarted = WiFi.softAP("DrawBot", "12345678");
  
  if (apStarted) {
    Serial.println("AP started successfully!");
    Serial.print("AP IP address: ");
    Serial.println(WiFi.softAPIP());
  } else {
    Serial.println("ERROR: Failed to start AP!");
  }

  Serial.println("Connect to WiFi: DrawBot");
  Serial.println("Password: 12345678");
  Serial.println("Then open: http://192.168.4.1 in your browser");

  // Define route handlers
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request)
            {
    // Check if website hashes still match
    if (request->hasHeader("If-None-Match")) {
      String etag = request->header("If-None-Match");
      if (etag.equals(index_gz_sha)) {
        Serial.println("ETag found. Sending 304");
        // Respond with HTTP 304 (Not Modified) if hashes match
        request->send(304);
        return;
      }
    }

    // Send new version otherwise
    AsyncWebServerResponse *response = request->beginResponse_P(200, "text/html", index_gz, index_gz_len);
    response->addHeader("Content-Encoding", "gzip");
    response->addHeader("ETag", index_gz_sha);

    Serial.println("No ETag found or mismatch. Sending 200");
    request->send(response); });

  server.on("/gcode", HTTP_POST, [](AsyncWebServerRequest *request)
            {
              if(request->hasParam("gcode", true))
              {
                String gcode = request->getParam("gcode", true)->value();
                setGCode(gcode);
                request->send(200, "text/plain", "OK");
              }

              request->send(400, "text/plain", "Missing gcode parameter"); });

  server.on("/status", HTTP_GET, [](AsyncWebServerRequest *request)
            {
      AsyncResponseStream *response = request->beginResponseStream("application/json");

      JsonDocument doc;

      Position pos = getCurrentPosition();
      doc["x"] = pos.x;
      doc["y"] = pos.y;
      doc["busy"] = isBusy();
      doc["raised"] = servoLift.read() == LIFT_UP_ANGLE;

      serializeJson(doc, *response);

      request->send(response); });

  server.on("/config", HTTP_GET, [](AsyncWebServerRequest *request) {
      AsyncResponseStream *response = request->beginResponseStream("application/json");

      JsonDocument doc;

      Position pos = getCurrentPosition();
      doc["minX"] = MIN_X;
      doc["maxX"] = MAX_X;
      doc["minY"] = MIN_Y;
      doc["maxY"] = MAX_Y;
      doc["homeX"] = HOMING_POSITION.x;
      doc["homeY"] = HOMING_POSITION.y;
      doc["speed"] = getSpeed();
      doc["minSpeed"] = MIN_SPEED;
      doc["maxSpeed"] = MAX_SPEED;
      doc["repeatMode"] = getRepeatMode();
      doc["smoothingEnabled"] = getSmoothingEnabled();
      doc["smoothingFactor"] = getSmoothingFactor();
      
      // Geometry parameters
      doc["L1"] = L1;  // Distance between servos
      doc["L2"] = L2;  // First arm length
      doc["L3"] = L3;  // Second arm length
      
      // Calibration offsets
      doc["offsetX"] = offsetX;
      doc["offsetY"] = offsetY;
      
      // LED and Buzzer
      doc["ledEnabled"] = ledEnabled;
      doc["ledR"] = ledR;
      doc["ledG"] = ledG;
      doc["ledB"] = ledB;
      doc["buzzerEnabled"] = buzzerEnabled;

      serializeJson(doc, *response);

      request->send(response);
  });

  // Geometry configuration (arm lengths)
  server.on("/geometry", HTTP_POST, [](AsyncWebServerRequest *request) {
      bool updated = false;
      
      if (request->hasParam("L1", true)) {
        L1 = request->getParam("L1", true)->value().toFloat();
        updated = true;
      }
      if (request->hasParam("L2", true)) {
        L2 = request->getParam("L2", true)->value().toFloat();
        updated = true;
      }
      if (request->hasParam("L3", true)) {
        L3 = request->getParam("L3", true)->value().toFloat();
        updated = true;
      }
      
      if (updated) {
        Serial.printf("Geometry updated: L1=%.1f, L2=%.1f, L3=%.1f\n", L1, L2, L3);
        request->send(200, "text/plain", "Geometry updated");
      } else {
        request->send(400, "text/plain", "Missing geometry parameter");
      }
  });

  // Calibration endpoint
  server.on("/calibration", HTTP_POST, [](AsyncWebServerRequest *request) {
      bool updated = false;
      
      if (request->hasParam("offsetX", true)) {
        offsetX = request->getParam("offsetX", true)->value().toFloat();
        updated = true;
      }
      if (request->hasParam("offsetY", true)) {
        offsetY = request->getParam("offsetY", true)->value().toFloat();
        updated = true;
      }
      if (request->hasParam("reset", true)) {
        offsetX = 0;
        offsetY = 0;
        updated = true;
      }
      
      if (updated) {
        Serial.printf("Calibration updated: offsetX=%.1f, offsetY=%.1f\n", offsetX, offsetY);
        request->send(200, "text/plain", "Calibration updated");
      } else {
        request->send(400, "text/plain", "Missing calibration parameter");
      }
  });

  // LED control
  server.on("/led", HTTP_POST, [](AsyncWebServerRequest *request) {
      if (request->hasParam("r", true) && request->hasParam("g", true) && request->hasParam("b", true)) {
        ledR = request->getParam("r", true)->value().toInt();
        ledG = request->getParam("g", true)->value().toInt();
        ledB = request->getParam("b", true)->value().toInt();
        
        // For single color LED (on ESP32-C3, just use digital on/off)
        // For RGB, you would need PWM pins - this is simplified
        if (ledR > 0 || ledG > 0 || ledB > 0) {
          digitalWrite(ledPin, HIGH);
          ledEnabled = true;
        } else {
          digitalWrite(ledPin, LOW);
          ledEnabled = false;
        }
        
        Serial.printf("LED: R=%d, G=%d, B=%d\n", ledR, ledG, ledB);
        request->send(200, "text/plain", "LED updated");
      } else if (request->hasParam("state", true)) {
        String state = request->getParam("state", true)->value();
        if (state == "on") {
          digitalWrite(ledPin, HIGH);
          ledEnabled = true;
          request->send(200, "text/plain", "LED ON");
        } else if (state == "off") {
          digitalWrite(ledPin, LOW);
          ledEnabled = false;
          request->send(200, "text/plain", "LED OFF");
        } else {
          request->send(400, "text/plain", "Invalid state");
        }
      } else {
        request->send(400, "text/plain", "Missing parameters");
      }
  });

  // Buzzer control
  server.on("/buzzer", HTTP_POST, [](AsyncWebServerRequest *request) {
      if (request->hasParam("state", true)) {
        String state = request->getParam("state", true)->value();
        if (state == "on") {
          digitalWrite(buzzerPin, HIGH);
          buzzerEnabled = true;
          request->send(200, "text/plain", "Buzzer ON");
        } else if (state == "off") {
          digitalWrite(buzzerPin, LOW);
          buzzerEnabled = false;
          request->send(200, "text/plain", "Buzzer OFF");
        } else {
          request->send(400, "text/plain", "Invalid state");
        }
      } else if (request->hasParam("beep", true)) {
        int duration = request->getParam("beep", true)->value().toInt();
        digitalWrite(buzzerPin, HIGH);
        delay(duration);
        digitalWrite(buzzerPin, LOW);
        buzzerEnabled = false;
        request->send(200, "text/plain", "Beep!");
      } else {
        request->send(400, "text/plain", "Missing parameters");
      }
  });

  // Sound notification (plays after drawing)
  server.on("/sound", HTTP_POST, [](AsyncWebServerRequest *request) {
      // Play a little tune on completion
      for (int i = 0; i < 3; i++) {
        digitalWrite(buzzerPin, HIGH);
        delay(100);
        digitalWrite(buzzerPin, LOW);
        delay(50);
      }
      request->send(200, "text/plain", "Sound played!");
  });

  server.on("/repeat", HTTP_POST, [](AsyncWebServerRequest *request)
            {
              if(request->hasParam("enabled", true))
              {
                String enabledStr = request->getParam("enabled", true)->value();
                bool enabled = (enabledStr == "true" || enabledStr == "1");
                setRepeatMode(enabled);
                request->send(200, "text/plain", enabled ? "Repeat mode ON" : "Repeat mode OFF");
              }
              request->send(400, "text/plain", "Missing enabled parameter"); });

  server.on("/smoothing", HTTP_POST, [](AsyncWebServerRequest *request)
            {
              if(request->hasParam("enabled", true) && request->hasParam("factor", true))
              {
                String enabledStr = request->getParam("enabled", true)->value();
                String factorStr = request->getParam("factor", true)->value();
                bool enabled = (enabledStr == "true" || enabledStr == "1");
                float factor = factorStr.toFloat();
                setSmoothingEnabled(enabled);
                setSmoothingFactor(factor);
                request->send(200, "text/plain", "OK");
              }
              request->send(400, "text/plain", "Missing parameters"); });

  server.on("/assembly", HTTP_POST, [](AsyncWebServerRequest *request)
            {
              Serial.println("Assembly...");
              assemblyPosition();
              request->send(200, "text/plain", "OK"); });

  server.on("/restart", HTTP_POST, [](AsyncWebServerRequest *request)
            {
              Serial.println("Restarting ESP...");
              ESP.restart(); });

  server.begin();
}

void loop()
{
  machineLoop();
  updateToolPosition();
}
