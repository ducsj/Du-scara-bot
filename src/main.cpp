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

// WiFi and server setup
AsyncWebServer server(80);

void setup()
{
  Serial.begin(115200);
  
  // Initialize servo pins
  servoLift.attach(liftServoPin);
  servoLeft.attach(servoLeftPin);
  servoRight.attach(servoRightPin);

  // Initialize WiFi in AP mode
  Serial.println("Starting WiFi AP mode...");
  WiFi.mode(WIFI_AP);
  WiFi.softAP("DrawBot", "12345678");
  Serial.print("AP IP: ");
  Serial.println(WiFi.softAPIP());
  Serial.println("Open: http://192.168.4.1");

  // Main page
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    AsyncWebServerResponse *response = request->beginResponse_P(200, "text/html", index_gz, index_gz_len);
    response->addHeader("Content-Encoding", "gzip");
    request->send(response);
  });

  // Receive G-code
  server.on("/gcode", HTTP_POST, [](AsyncWebServerRequest *request) {
    if(request->hasParam("gcode", true)) {
      String gcode = request->getParam("gcode", true)->value();
      setGCode(gcode);
      request->send(200, "text/plain", "OK");
    } else {
      request->send(400, "text/plain", "Missing gcode");
    }
  });

  // Get status
  server.on("/status", HTTP_GET, [](AsyncWebServerRequest *request) {
    AsyncResponseStream *response = request->beginResponseStream("application/json");
    JsonDocument doc;
    Position pos = getCurrentPosition();
    doc["x"] = pos.x;
    doc["y"] = pos.y;
    doc["busy"] = isBusy();
    doc["raised"] = servoLift.read() == LIFT_UP_ANGLE;
    serializeJson(doc, *response);
    request->send(response);
  });

  // Get config
  server.on("/config", HTTP_GET, [](AsyncWebServerRequest *request) {
    AsyncResponseStream *response = request->beginResponseStream("application/json");
    JsonDocument doc;
    doc["minX"] = MIN_X;
    doc["maxX"] = MAX_X;
    doc["minY"] = MIN_Y;
    doc["maxY"] = MAX_Y;
    doc["homeX"] = HOMING_POSITION.x;
    doc["homeY"] = HOMING_POSITION.y;
    doc["speed"] = getSpeed();
    doc["minSpeed"] = MIN_SPEED;
    doc["maxSpeed"] = MAX_SPEED;
    doc["L1"] = L1;
    doc["L2"] = L2;
    doc["L3"] = L3;
    doc["offsetX"] = offsetX;
    doc["offsetY"] = offsetY;
    serializeJson(doc, *response);
    request->send(response);
  });

  // Repeat mode
  server.on("/repeat", HTTP_POST, [](AsyncWebServerRequest *request) {
    if(request->hasParam("enabled", true)) {
      bool enabled = request->getParam("enabled", true)->value() == "true";
      setRepeatMode(enabled);
      request->send(200, "text/plain", enabled ? "ON" : "OFF");
    } else {
      request->send(400, "text/plain", "Missing");
    }
  });

  // Assembly position
  server.on("/assembly", HTTP_POST, [](AsyncWebServerRequest *request) {
    assemblyPosition();
    request->send(200, "text/plain", "OK");
  });

  // Restart
  server.on("/restart", HTTP_POST, [](AsyncWebServerRequest *request) {
    ESP.restart();
  });

  server.begin();
}

void loop()
{
  machineLoop();
  updateToolPosition();
}