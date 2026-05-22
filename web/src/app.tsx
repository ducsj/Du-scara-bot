import { useEffect, useState } from 'preact/hooks';
import { Position } from './types/position';
import { Button } from './components/button/button';
import { ButtonGroup } from './components/button/button-group';
import { Card } from './components/card/card';
import { Status } from './components/status/status';
import { PrintSurface } from './components/print-surface/print-surface';
import { useQuery } from './hooks/use-query';
import {
  assembly,
  home,
  move,
  raiseTool,
  restart,
  getConfig,
  print,
  setSpeed,
  setRepeatMode,
  setSmoothing,
} from './lib/queries';
import { useGCode } from './reducers/gcode-reducer';
import { Config } from './types/config';
import { handleStopPropagation, downloadFile, readFile } from './lib/helpers';
import { Slider } from './components/slider/slider';
import { NumberInput } from './components/input/number-input';
import { interpolateGcode } from './lib/interpolation';
import { post } from './lib/http-client';

const initialConfig: Config = {
  minX: -50,
  minY: 25,
  maxX: 50,
  maxY: 125,
  homeX: 0,
  homeY: 25,
  speed: 100,
  minSpeed: 10,
  maxSpeed: 200,
  repeatMode: false,
  smoothingEnabled: false,
  smoothingFactor: 0.3,
  L1: 25.8,
  L2: 60.0,
  L3: 70.0,
  offsetX: 0,
  offsetY: 0,
  ledEnabled: false,
  buzzerEnabled: false,
};

export function App() {
  const [toolPosition, setToolPosition] = useState<Position>({ x: 0, y: 0 });
  const { gcode, setGCode, addLine, clearAll, clearLine } = useGCode();
  const [repeatMode, setRepeatModeState] = useState(false);
  const [smoothingEnabled, setSmoothingEnabled] = useState(false);
  const [smoothingFactor, setSmoothingFactorState] = useState(0.3);
  const [interpolationEnabled, setInterpolationEnabled] = useState(false);
  const [interpolationLevel, setInterpolationLevel] = useState(5);
  
  // Geometry parameters
  const [L1, setL1] = useState(25.8);
  const [L2, setL2] = useState(60.0);
  const [L3, setL3] = useState(70.0);
  
  // Calibration offset
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  
  // Debug tools
  const [testX, setTestX] = useState(0);
  const [testY, setTestY] = useState(25);
  const [commandLog, setCommandLog] = useState<string[]>([]);
  const [currentPos, setCurrentPos] = useState({x: 0, y: 0});
  
  // LED and Buzzer
  const [ledEnabled, setLedEnabled] = useState(false);
  const [buzzerEnabled, setBuzzerEnabled] = useState(false);
  
  const config = useQuery(getConfig, { initialData: initialConfig });

  useEffect(() => {
    if (config.data) {
      setToolPosition({ x: config.data.homeX, y: config.data.homeY });
      setRepeatModeState(config.data.repeatMode);
      setSmoothingEnabled(config.data.smoothingEnabled);
      setSmoothingFactorState(config.data.smoothingFactor);
      setL1(config.data.L1 || 25.8);
      setL2(config.data.L2 || 60.0);
      setL3(config.data.L3 || 70.0);
      setOffsetX(config.data.offsetX || 0);
      setOffsetY(config.data.offsetY || 0);
      setLedEnabled(config.data.ledEnabled || false);
      setBuzzerEnabled(config.data.buzzerEnabled || false);
    }
  }, [config.data]);

  const handleHome = () => {
    home();
    if (config.data) {
      setToolPosition({ x: config.data.homeX, y: config.data.homeY });
    }
  };

  const handleSetPosition = (position: Position) => {
    move(position);
    setToolPosition(position);
  };

  const handleSave = () => {
    downloadFile('drawing.gcode', gcode.join('\n'));
  };

  const handleLoad = async () => {
    const content = await readFile(['gcode', 'txt']);
    let lines = content.split('\n');
    if (interpolationEnabled) {
      lines = interpolateGcode(lines, interpolationLevel);
    }
    setGCode(lines);
  };

  const handleLoadSample = async (sampleName: string) => {
    try {
      const response = await fetch(`/samples/${sampleName}`);
      const content = await response.text();
      let lines = content.split('\n');
      setGCode(lines);
    } catch (error) {
      console.error('Failed to load sample:', error);
    }
  };

  const handleRepeatModeToggle = () => {
    const newValue = !repeatMode;
    setRepeatModeState(newValue);
    setRepeatMode(newValue);
  };

  const handleSmoothingToggle = () => {
    const newValue = !smoothingEnabled;
    setSmoothingEnabled(newValue);
    setSmoothing(newValue, smoothingFactor);
  };

  const handleSmoothingFactorChange = (value: number) => {
    setSmoothingFactorState(value);
    setSmoothing(smoothingEnabled, value);
  };

  const handleInterpolationToggle = () => {
    const newValue = !interpolationEnabled;
    setInterpolationEnabled(newValue);
  };

  const handleInterpolationLevelChange = (value: number) => {
    setInterpolationLevel(Math.round(value));
  };

  const handleApplyInterpolation = () => {
    if (gcode.length > 0) {
      const interpolated = interpolateGcode(gcode, interpolationLevel);
      setGCode(interpolated);
    }
  };

  const handleLedToggle = () => {
    const newValue = !ledEnabled;
    setLedEnabled(newValue);
    const body = new FormData();
    body.append('state', newValue ? 'on' : 'off');
    post('/led', body);
  };

  const handleBuzzerToggle = () => {
    const newValue = !buzzerEnabled;
    setBuzzerEnabled(newValue);
    const body = new FormData();
    body.append('state', newValue ? 'on' : 'off');
    post('/buzzer', body);
  };

  const handleBuzzerBeep = () => {
    const body = new FormData();
    body.append('beep', '200');
    post('/buzzer', body);
  };

  const handleL1Change = (value: number) => {
    setL1(value);
    const body = new FormData();
    body.append('L1', value.toString());
    post('/geometry', body);
  };

  const handleL2Change = (value: number) => {
    setL2(value);
    const body = new FormData();
    body.append('L2', value.toString());
    post('/geometry', body);
  };

  const handleL3Change = (value: number) => {
    setL3(value);
    const body = new FormData();
    body.append('L3', value.toString());
    post('/geometry', body);
  };

  const handleOffsetXChange = (value: number) => {
    setOffsetX(value);
    const body = new FormData();
    body.append('offsetX', value.toString());
    post('/calibration', body);
  };

  const handleOffsetYChange = (value: number) => {
    setOffsetY(value);
    const body = new FormData();
    body.append('offsetY', value.toString());
    post('/calibration', body);
  };

  const handleResetCalibration = () => {
    setOffsetX(0);
    setOffsetY(0);
    const body = new FormData();
    body.append('reset', 'true');
    post('/calibration', body);
    addLog('Calibration reset to zero');
  };

  // Debug tool functions
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setCommandLog(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]);
  };

  const handleGotoPoint = () => {
    const cmd = `G0 X${testX} Y${testY}`;
    addLog(`Testing point: X=${testX}, Y=${testY}`);
    // Send via API
    const body = new FormData();
    body.append('gcode', cmd);
    post('/gcode', body);
  };

  const handleRaiseAndGoto = () => {
    const cmd = `M5\nG0 X${testX} Y${testY}\nM3`;
    addLog(`Raise pen and goto: X=${testX}, Y=${testY}`);
    const body = new FormData();
    body.append('gcode', cmd);
    post('/gcode', body);
  };

  const handleClearLog = () => {
    setCommandLog([]);
  };

  const handleSetTestPoint = (x: number, y: number) => {
    setTestX(x);
    setTestY(y);
    addLog(`Set test point: X=${x}, Y=${y}`);
  };

  const handlePrint = () => {
    print(gcode, repeatMode);
  };

  const hasLines = gcode.length > 0;

  return (
    <main>
      <Card
        title={
          <>
            Drawing Robot
            <Status />
          </>
        }
      >
        {config.data && (
          <PrintSurface
            config={config.data}
            toolPosition={toolPosition}
            setToolPosition={handleSetPosition}
            gcode={gcode}
            addGCode={addLine}
          />
        )}

        <hr />

        <ButtonGroup>
          <Button
            label="Clear"
            disabled={!hasLines}
            onClick={handleStopPropagation(clearAll)}
          />
          <Button
            label="Back"
            disabled={!hasLines}
            onClick={handleStopPropagation(clearLine)}
          />

          <Button
            label="Load"
            style={{ marginLeft: 'auto' }}
            onClick={handleLoad}
          />
          <Button label="Save" disabled={!hasLines} onClick={handleSave} />
          <Button
            label="Print"
            disabled={!hasLines}
            onClick={handlePrint}
          />
        </ButtonGroup>

        <hr />

        <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>
          Sample Patterns (Pre-smoothed G-code):
        </div>
        <ButtonGroup>
          <Button
            label="Triangle"
            onClick={() => handleLoadSample('triangle-smooth.gcode')}
          />
          <Button
            label="Square"
            onClick={() => handleLoadSample('square-smooth.gcode')}
          />
          <Button
            label="Circle"
            onClick={() => handleLoadSample('circle-smooth.gcode')}
          />
          <Button
            label="Heart"
            onClick={() => handleLoadSample('heart-smooth.gcode')}
          />
          <Button
            label="Wave"
            onClick={() => handleLoadSample('wave-smooth.gcode')}
          />
        </ButtonGroup>
      </Card>

      <Card title="Drawing Options">
        <ButtonGroup>
          <Button
            label={repeatMode ? "Repeat: ON" : "Repeat: OFF"}
            active={repeatMode}
            onClick={handleRepeatModeToggle}
            disabled={!hasLines}
          />
          <Button
            label={smoothingEnabled ? "Smoothing: ON" : "Smoothing: OFF"}
            active={smoothingEnabled}
            onClick={handleSmoothingToggle}
          />
        </ButtonGroup>

        {smoothingEnabled && (
          <Slider
            label="Smoothing Level:"
            value={smoothingFactor}
            onChange={handleSmoothingFactorChange}
            min={0}
            max={1}
            step={0.1}
            fn={x => x.toFixed(1)}
          />
        )}
      </Card>

      <Card title="Interpolation (Smoothing)">
        <ButtonGroup>
          <Button
            label={interpolationEnabled ? "Auto-Smooth: ON" : "Auto-Smooth: OFF"}
            active={interpolationEnabled}
            onClick={handleInterpolationToggle}
          />
          <Button
            label="Apply Now"
            onClick={handleApplyInterpolation}
            disabled={!hasLines}
          />
        </ButtonGroup>

        <Slider
          label="Points per segment:"
          value={interpolationLevel}
          onChange={handleInterpolationLevelChange}
          min={1}
          max={20}
          step={1}
          fn={x => x.toString()}
        />

        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          Adds extra points between line segments for smoother curves.
          Higher = smoother but more gcode lines.
        </div>
      </Card>

      <Card title="Robot Geometry">
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
          Adjust arm lengths to match your physical robot. Changes take effect on next move.
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <NumberInput
            label="L1 (Servo distance):"
            value={L1}
            onChange={handleL1Change}
            unit="mm"
            step={0.1}
          />
          <NumberInput
            label="L2 (Arm 1 length):"
            value={L2}
            onChange={handleL2Change}
            unit="mm"
          />
          <NumberInput
            label="L3 (Arm 2 length):"
            value={L3}
            onChange={handleL3Change}
            unit="mm"
          />
        </div>
      </Card>

      <Card title="Calibration">
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
          Adjust X/Y offset to correct position errors. Positive values move pen right/up.
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <NumberInput
            label="X Offset:"
            value={offsetX}
            onChange={handleOffsetXChange}
            unit="mm"
            step={0.1}
          />
          <NumberInput
            label="Y Offset:"
            value={offsetY}
            onChange={handleOffsetYChange}
            unit="mm"
            step={0.1}
          />
          <Button
            label="Reset to Zero"
            onClick={handleResetCalibration}
          />
        </div>
        <div style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
          Tip: Draw a square, measure error, adjust offset accordingly.
        </div>
      </Card>

      <Card title="LED & Buzzer">
        <ButtonGroup>
          <Button
            label={ledEnabled ? "LED: ON" : "LED: OFF"}
            active={ledEnabled}
            onClick={handleLedToggle}
          />
          <Button
            label={buzzerEnabled ? "Buzzer: ON" : "Buzzer: OFF"}
            active={buzzerEnabled}
            onClick={handleBuzzerToggle}
          />
          <Button
            label="🔊 Beep"
            onClick={handleBuzzerBeep}
          />
        </ButtonGroup>
        
        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          LED indicator and buzzer for notifications. Beep plays a short sound.
        </div>
      </Card>

      <Card title="Debug Tools">
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
          Test individual coordinates. Enter X/Y and click to move pen to that position.
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '12px' }}>
          <NumberInput
            label="X:"
            value={testX}
            onChange={(v) => setTestX(v)}
            step={1}
          />
          <NumberInput
            label="Y:"
            value={testY}
            onChange={(v) => setTestY(v)}
            step={1}
          />
          <Button
            label="✏️ Draw Here"
            onClick={handleRaiseAndGoto}
          />
          <Button
            label="🎯 Goto Only"
            onClick={handleGotoPoint}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <Button label="Home (0,25)" onClick={() => handleSetTestPoint(0, 25)} />
          <Button label="(-30, 50)" onClick={() => handleSetTestPoint(-30, 50)} />
          <Button label="(30, 50)" onClick={() => handleSetTestPoint(30, 50)} />
          <Button label="(0, 75)" onClick={() => handleSetTestPoint(0, 75)} />
        </div>
        
        <div style={{ marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Command Log</span>
            <Button label="Clear" onClick={handleClearLog} style={{ padding: '4px 8px', fontSize: '11px' }} />
          </div>
          <div style={{
            background: '#1a1a2e',
            color: '#0f0',
            fontFamily: 'monospace',
            fontSize: '11px',
            padding: '8px',
            borderRadius: '4px',
            maxHeight: '120px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {commandLog.length === 0 ? 'No commands yet...' : commandLog.join('\n')}
          </div>
        </div>
      </Card>

      <Card title="Control">
        <ButtonGroup>
          <Button label="Raise pen" onClick={() => raiseTool()} />
          <Button label="Lower pen" onClick={() => raiseTool(false)} />
          <Button label="Home pen" onClick={handleHome} />
          <Button label="Restart ESP" onClick={restart} />
          <Button label="Assembly" onClick={assembly} />
        </ButtonGroup>

        <hr />

        <Slider
          label="Speed:"
          value={config.data?.speed || 0}
          onChange={setSpeed}
          min={config.data?.minSpeed}
          max={config.data?.maxSpeed}
        />
      </Card>

      {gcode.length > 0 && (
        <Card title={`GCode (${gcode.length})`} expandable>
          <pre>{gcode.join('\n')}</pre>
        </Card>
      )}
    </main>
  );
}
