#pragma once

#include <Arduino.h>
#include <types.h>

// Robot geometry - Default values (can be changed via API)
extern float L1; // Distance between the two servos (mm)
extern float L2; // Length of the first arm connected to servo (mm)
extern float L3; // Length of the second arm connected to the pen (mm)

// Lift positions
extern int LIFT_DOWN_ANGLE; // Lift down angle
extern int LIFT_UP_ANGLE;   // Lift up angle
extern int LIFT_WAIT;       // Lift wait time

// Constraints for the pen position
extern float MIN_Y;  // Minimum Y position
extern float MAX_Y; // Maximum Y position
extern float MIN_X; // Minimum X position
extern float MAX_X;  // Maximum X position

extern Position HOMING_POSITION; // Homing position

// Speed
extern float MIN_SPEED; // Minimum speed mm/s
extern float MAX_SPEED; // Maximum speed mm/s
extern float DEFAULT_SPEED; // Velocity of the pen mm/s

// Tolerance for comparing positions
const float MAX_DELTA = 0.1;

// Servo pins
static const int liftServoPin = GPIO_NUM_0;
static const int servoLeftPin = GPIO_NUM_2;
static const int servoRightPin = GPIO_NUM_1;

// LED and Buzzer pins
static const int ledPin = GPIO_NUM_10;        // Built-in RGB LED (or custom)
static const int buzzerPin = GPIO_NUM_21;     // Buzzer pin

// Local domain name (mDNS hostname)
extern const char* LOCAL_DOMAIN;
