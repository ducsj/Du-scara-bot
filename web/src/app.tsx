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
} from './lib/queries';
import { useGCode } from './reducers/gcode-reducer';
import { Config } from './types/config';
import { handleStopPropagation, downloadFile, readFile } from './lib/helpers';
import { Slider } from './components/slider/slider';

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
  L1: 25.8,
  L2: 60.0,
  L3: 70.0,
  offsetX: 0,
  offsetY: 0,
};

export function App() {
  const [toolPosition, setToolPosition] = useState<Position>({ x: 0, y: 0 });
  const { gcode, setGCode, clearAll, clearLine, addLine } = useGCode();
  const [repeatMode, setRepeatModeState] = useState(false);
  
  const config = useQuery(getConfig, { initialData: initialConfig });

  useEffect(() => {
    if (config.data) {
      setToolPosition({ x: config.data.homeX, y: config.data.homeY });
      setRepeatModeState(config.data.repeatMode);
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
    let lines = content.split('\n').filter(line => line.trim());
    setGCode(lines);
  };

  const handleAddGCode = (line: string | string[]) => {
    const lines = Array.isArray(line) ? line : [line];
    lines.forEach(l => addLine(l));
  };

  const handleRepeatModeToggle = () => {
    const newValue = !repeatMode;
    setRepeatModeState(newValue);
    setRepeatMode(newValue);
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
            addGCode={handleAddGCode}
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

        <ButtonGroup>
          <Button
            label={repeatMode ? "Repeat: ON" : "Repeat: OFF"}
            active={repeatMode}
            onClick={handleRepeatModeToggle}
          />
        </ButtonGroup>
      </Card>

      <Card title="Control">
        <ButtonGroup>
          <Button label="Raise pen" onClick={() => raiseTool()} />
          <Button label="Lower pen" onClick={() => raiseTool(false)} />
          <Button label="Home" onClick={handleHome} />
          <Button label="Restart" onClick={restart} />
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