#pragma once

#include <map>

#include <helpers.h>

struct GCodeLine
{
    String cmd;                     // Command (e.g., G1, M3)
    std::map<String, float> params; // Parameters (e.g., X, Y, Z, etc.)
};

extern String gCode;
extern bool repeatMode;
extern bool smoothingEnabled;
extern float smoothingFactor;

void setGCode(String newGCode);

void setRepeatMode(bool enabled);

bool getRepeatMode();

void setSmoothingEnabled(bool enabled);

bool getSmoothingEnabled();

void setSmoothingFactor(float factor);

float getSmoothingFactor();

void machineLoop();

void processGCode(String &code);
