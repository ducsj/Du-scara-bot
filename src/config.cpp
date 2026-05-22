#include <config.h>
#include <types.h>

// Robot geometry - Default values (can be changed via API)
float L1 = 25.8;  // Distance between the two servos (mm)
float L2 = 60.0;  // Length of the first arm connected to servo (mm)
float L3 = 70.0;  // Length of the second arm connected to the pen (mm)

// Calibration offset (mm)
float offsetX = 0;  // X offset for position correction
float offsetY = 0;  // Y offset for position correction

// Lift positions
int LIFT_DOWN_ANGLE = 120;  // Lift down angle
int LIFT_UP_ANGLE = 172;   // Lift up angle
int LIFT_WAIT = 300;        // Lift wait time

// Constraints for the pen position
float MIN_Y = 25;   // Minimum Y position
float MAX_Y = 125;  // Maximum Y position
float MIN_X = -50;  // Minimum X position
float MAX_X = 50;  // Maximum X position

Position HOMING_POSITION = {x: 0, y: MIN_Y};  // Homing position

// Speed
float MIN_SPEED = 10;      // Minimum speed mm/s
float MAX_SPEED = 300;     // Maximum speed mm/s
float DEFAULT_SPEED = 100; // Velocity of the pen mm/s