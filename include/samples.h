#pragma once
#include <Arduino.h>

// Triangle sample
const char triangle_gcode[] PROGMEM = R"(
M3
G1 X0 Y50
G1 X3 Y53.3
G1 X6 Y56.7
G1 X9 Y60
G1 X12 Y63.3
G1 X15 Y66.7
G1 X18 Y70
G1 X21 Y73.3
G1 X24 Y76.7
G1 X27 Y80
G1 X30 Y80
G1 X24.3 Y80
G1 X18.6 Y80
G1 X12.9 Y80
G1 X7.2 Y80
G1 X1.5 Y80
G1 X-4.2 Y80
G1 X-9.9 Y80
G1 X-15.6 Y80
G1 X-21.3 Y80
G1 X-27 Y80
G1 X-30 Y80
G1 X-24.3 Y76.7
G1 X-18.6 Y73.3
G1 X-12.9 Y70
G1 X-7.2 Y66.7
G1 X-1.5 Y63.3
G1 X4.2 Y60
G1 X9.9 Y56.7
G1 X15.6 Y53.3
G1 X21.3 Y50
G1 X27 Y50
G1 X21.3 Y50
G1 X15.6 Y50
G1 X9.9 Y50
G1 X4.2 Y50
G1 X-1.5 Y50
G1 X-7.2 Y50
G1 X-12.9 Y50
G1 X-18.6 Y50
G1 X-24.3 Y50
G1 X-30 Y50
G1 X0 Y50
M5
)";

// Square sample
const char square_gcode[] PROGMEM = R"(
M3
G1 X20 Y50
G1 X20 Y70
G1 X-20 Y70
G1 X-20 Y50
G1 X20 Y50
M5
)";

// Circle sample (pre-smoothed with arc commands)
const char circle_gcode[] PROGMEM = R"(
M3
G0 X0 Y65
M3
G2 X0 Y55 I0 J-5
G2 X0 Y65 I0 J5
M5
)";

// Heart sample
const char heart_gcode[] PROGMEM = R"(
M3
G1 X0 Y55
G1 X2.5 Y57.5
G1 X5 Y55
G1 X7.5 Y52.5
G1 X10 Y55
G1 X12.5 Y57.5
G1 X15 Y55
G1 X17.5 Y52.5
G1 X20 Y55
G1 X22.5 Y57.5
G1 X25 Y55
G1 X27.5 Y52.5
G1 X30 Y55
G1 X27.5 Y60
G1 X25 Y65
G1 X22.5 Y70
G1 X20 Y75
G1 X17.5 Y80
G1 X15 Y85
G1 X12.5 Y90
G1 X10 Y95
G1 X7.5 Y100
G1 X5 Y105
G1 X2.5 Y110
G1 X0 Y115
G1 X-2.5 Y110
G1 X-5 Y105
G1 X-7.5 Y100
G1 X-10 Y95
G1 X-12.5 Y90
G1 X-15 Y85
G1 X-17.5 Y80
G1 X-20 Y75
G1 X-22.5 Y70
G1 X-25 Y65
G1 X-27.5 Y60
G1 X-30 Y55
G1 X-27.5 Y52.5
G1 X-25 Y55
G1 X-22.5 Y57.5
G1 X-20 Y55
G1 X-17.5 Y52.5
G1 X-15 Y55
G1 X-12.5 Y57.5
G1 X-10 Y55
G1 X-7.5 Y52.5
G1 X-5 Y55
G1 X-2.5 Y57.5
G1 X0 Y55
M5
)";

// Wave sample
const char wave_gcode[] PROGMEM = R"(
M3
G1 X-30 Y50
G1 X-25 Y60
G1 X-20 Y50
G1 X-15 Y60
G1 X-10 Y50
G1 X-5 Y60
G1 X0 Y50
G1 X5 Y60
G1 X10 Y50
G1 X15 Y60
G1 X20 Y50
G1 X25 Y60
G1 X30 Y50
M5
)";

// Sample names and pointers for dynamic serving
struct SampleGcode {
    const char* name;
    const char* gcode;
};

const SampleGcode SAMPLES[] PROGMEM = {
    {"triangle-smooth.gcode", triangle_gcode},
    {"square-smooth.gcode", square_gcode},
    {"circle-smooth.gcode", circle_gcode},
    {"heart-smooth.gcode", heart_gcode},
    {"wave-smooth.gcode", wave_gcode}
};

const int SAMPLES_COUNT = 5;
