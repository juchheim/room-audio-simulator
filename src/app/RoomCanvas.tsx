import React from "react";
import type {
  Mains,
  Opening,
  Room,
  Seat,
  Subwoofer,
  Treatment,
} from "../domain/projectState";
import type {
  GhostSubPlacement,
  HeatmapGrid,
  HeatmapRegion,
  SeatMicroMove,
  ZoneGuidance,
} from "../domain/analysis";
import type { SnapZone } from "../domain/snapZones";

const CANVAS_HEIGHT = 420;

const COLORS = {
  background: "#fefbf6",
  border: "#b3a894",
  opening: "#d9582a",
  label: "#5d564a",
  seat: "#2e6f95",
  mains: "#5a4c3b",
  sub: "#c04f2f",
  zone: "#9a8f7c",
  zoneDisabled: "#d8cdbc",
  zoneBest: "#4c8a5d",
  zoneOk: "#c3a246",
  zoneLimited: "#b05a47",
  treatment: {
    corner_trap: "#3a6a7a",
    rear_wall_absorber: "#6f4b3e",
    thick_panel: "#7a6f5c",
    tuned_trap: "#8b5b34",
  },
  ghostSub: "#c04f2f",
  ghostSeat: "#2e6f95",
  ghostLabel: "#5c4e40",
  contributionPill: "#f4e4d2",
  contributionStroke: "#d4c3af",
  contributionText: "#5c4e40",
};

const HEATMAP_STOPS = [
  { value: 0, color: "#fdf5e6" },
  { value: 0.5, color: "#f1ba88" },
  { value: 1, color: "#c94a3b" },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const toHex = (value: number) =>
    Math.round(value).toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function mixColor(start: string, end: string, t: number): string {
  const a = hexToRgb(start);
  const b = hexToRgb(end);
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

function getHeatmapColor(value: number): string {
  const clamped = clamp(value, 0, 1);
  let lower = HEATMAP_STOPS[0];
  let upper = HEATMAP_STOPS[HEATMAP_STOPS.length - 1];

  for (const stop of HEATMAP_STOPS) {
    if (stop.value <= clamped) {
      lower = stop;
    }
    if (stop.value >= clamped) {
      upper = stop;
      break;
    }
  }

  if (lower === upper) {
    return lower.color;
  }

  const t = (clamped - lower.value) / (upper.value - lower.value);
  return mixColor(lower.color, upper.color, t);
}

function getHeatmapValueAt(
  heatmap: HeatmapGrid | undefined,
  room: Room,
  position: { x: number; y: number },
): number {
  if (!heatmap || room.width <= 0 || room.length <= 0) {
    return 0.5;
  }
  const col = Math.max(
    0,
    Math.min(
      heatmap.cols - 1,
      Math.floor((position.x / room.width) * heatmap.cols),
    ),
  );
  const row = Math.max(
    0,
    Math.min(
      heatmap.rows - 1,
      Math.floor((position.y / room.length) * heatmap.rows),
    ),
  );
  const value = heatmap.values[row * heatmap.cols + col];
  return value ?? 0.5;
}

function getRoomScale(room: Room, widthPx: number, heightPx: number): number {
  const scaleX = widthPx / room.width;
  const scaleY = heightPx / room.length;
  return Math.min(scaleX, scaleY);
}

function clampOpeningCenter(opening: Opening, room: Room): number {
  const wallLength =
    opening.wall === "front" || opening.wall === "rear"
      ? room.width
      : room.length;
  if (wallLength <= 0) {
    return opening.positionAlongWallNorm;
  }

  const normalizedWidth = opening.width / wallLength;
  const halfSpan = Math.min(0.5, normalizedWidth / 2);
  return clamp(opening.positionAlongWallNorm, halfSpan, 1 - halfSpan);
}

function getOpeningSegment(
  opening: Opening,
  room: Room,
  roomX: number,
  roomY: number,
  scale: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const centerNorm = clampOpeningCenter(opening, room);
  const wallLength =
    opening.wall === "front" || opening.wall === "rear"
      ? room.width
      : room.length;
  const halfSpan = opening.width / 2;
  const centerMeters = centerNorm * wallLength;

  if (opening.wall === "front" || opening.wall === "rear") {
    const y = opening.wall === "front" ? roomY : roomY + room.length * scale;
    const xCenter = roomX + centerMeters * scale;
    return {
      x1: xCenter - halfSpan * scale,
      y1: y,
      x2: xCenter + halfSpan * scale,
      y2: y,
    };
  }

  const x = opening.wall === "left" ? roomX : roomX + room.width * scale;
  const yCenter = roomY + centerMeters * scale;
  return {
    x1: x,
    y1: yCenter - halfSpan * scale,
    x2: x,
    y2: yCenter + halfSpan * scale,
  };
}

export type RoomCanvasProps = {
  room: Room;
  opening: Opening | null;
  snapZones: SnapZone[];
  seat: Seat;
  mains: Mains;
  subwoofer: Subwoofer;
  treatments: Treatment[];
  invalidTreatmentIds: Set<string>;
  heatmap?: HeatmapGrid;
  heatmapRegion?: HeatmapRegion;
  portContributionLabel?: string;
  ghostSubPlacements?: GhostSubPlacement[];
  ghostSeatMoves?: SeatMicroMove[];
  zoneGuidance?: ZoneGuidance;
  showRipples: boolean;
  onToggleRipples: (enabled: boolean) => void;
  onSeatChange: (seat: Seat) => void;
  onMainsChange: (mains: Mains) => void;
  onSubwooferChange: (subwoofer: Subwoofer) => void;
  onApplyGhostSubPlacement: (placement: GhostSubPlacement) => void;
  onApplySeatMove: (move: SeatMicroMove) => void;
};

type DragTarget = "seat" | "subwoofer" | "mains-left" | "mains-right";
type DragState = { target: DragTarget; pointerId: number } | null;

export function RoomCanvas({
  room,
  opening,
  snapZones,
  seat,
  mains,
  subwoofer,
  treatments,
  invalidTreatmentIds,
  heatmap,
  heatmapRegion,
  portContributionLabel,
  ghostSubPlacements,
  ghostSeatMoves,
  zoneGuidance,
  showRipples,
  onToggleRipples,
  onSeatChange,
  onMainsChange,
  onSubwooferChange,
  onApplyGhostSubPlacement,
  onApplySeatMove,
}: RoomCanvasProps): React.ReactElement {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = React.useState(720);
  const [dragging, setDragging] = React.useState<DragState>(null);

  React.useEffect(() => {
    if (!wrapperRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  const scale = React.useMemo(() => getRoomScale(room, width, CANVAS_HEIGHT), [
    room,
    width,
  ]);

  const roomPixelWidth = room.width * scale;
  const roomPixelHeight = room.length * scale;
  const offsetX = (width - roomPixelWidth) / 2;
  const offsetY = (CANVAS_HEIGHT - roomPixelHeight) / 2;

  const toSvgX = React.useCallback(
    (xMeters: number) => offsetX + xMeters * scale,
    [offsetX, scale],
  );

  const toSvgY = React.useCallback(
    (yMeters: number) => offsetY + yMeters * scale,
    [offsetY, scale],
  );

  const clientToRoom = React.useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) {
        return { x: seat.x, y: seat.y };
      }

      const rect = svg.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const roomX = (localX - offsetX) / scale;
      const roomY = (localY - offsetY) / scale;

      return {
        x: clamp(roomX, 0, room.width),
        y: clamp(roomY, 0, room.length),
      };
    },
    [offsetX, offsetY, room.length, room.width, scale, seat.x, seat.y],
  );

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging || dragging.pointerId !== event.pointerId) {
        return;
      }

      const next = clientToRoom(event.clientX, event.clientY);
      if (dragging.target === "seat") {
        onSeatChange({ x: next.x, y: next.y });
        return;
      }

      if (dragging.target === "subwoofer") {
        onSubwooferChange({ ...subwoofer, x: next.x, y: next.y });
        return;
      }

      if (!mains.enabled) {
        return;
      }

      if (dragging.target === "mains-left") {
        onMainsChange({
          ...mains,
          left: { x: next.x, y: next.y },
        });
        return;
      }

      onMainsChange({
        ...mains,
        right: { x: next.x, y: next.y },
      });
    },
    [
      clientToRoom,
      dragging,
      mains,
      onMainsChange,
      onSeatChange,
      onSubwooferChange,
      subwoofer,
    ],
  );

  const handlePointerUp = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging || dragging.pointerId !== event.pointerId) {
        return;
      }

      svgRef.current?.releasePointerCapture(event.pointerId);
      setDragging(null);
    },
    [dragging],
  );

  const startDrag = React.useCallback(
    (event: React.PointerEvent<SVGElement>, target: DragTarget) => {
      event.preventDefault();
      svgRef.current?.setPointerCapture(event.pointerId);
      setDragging({ target, pointerId: event.pointerId });
    },
    [],
  );

  const openingSegment =
    opening && room
      ? getOpeningSegment(opening, room, offsetX, offsetY, scale)
      : null;

  const rippleSources = React.useMemo(() => {
    if (!showRipples) {
      return [];
    }
    const sources: Array<{ x: number; y: number; intensity: number; tone: string }> = [];
    const subIntensity = getHeatmapValueAt(heatmap, room, subwoofer);
    sources.push({
      x: subwoofer.x,
      y: subwoofer.y,
      intensity: subIntensity,
      tone: COLORS.zone,
    });
    if (mains.enabled) {
      const midpoint = {
        x: (mains.left.x + mains.right.x) / 2,
        y: (mains.left.y + mains.right.y) / 2,
      };
      sources.push({
        x: midpoint.x,
        y: midpoint.y,
        intensity: getHeatmapValueAt(heatmap, room, midpoint) * 0.7,
        tone: COLORS.label,
      });
    }
    return sources;
  }, [heatmap, mains, room, showRipples, subwoofer]);

  const rippleBaseRadius = Math.max(
    12,
    Math.min(roomPixelWidth, roomPixelHeight) * 0.08,
  );
  const rippleDelays = [0, 1.1, 2.2];

  const heatmapCells = React.useMemo(() => {
    if (!heatmap) {
      return null;
    }
    const cellWidth = roomPixelWidth / heatmap.cols;
    const cellHeight = roomPixelHeight / heatmap.rows;
    return heatmap.values.map((value, index) => {
      const row = Math.floor(index / heatmap.cols);
      const col = index % heatmap.cols;
      return (
        <rect
          key={`heat-${row}-${col}`}
          x={offsetX + col * cellWidth}
          y={offsetY + row * cellHeight}
          width={cellWidth + 0.5}
          height={cellHeight + 0.5}
          fill={getHeatmapColor(value)}
          opacity={0.65}
        />
      );
    });
  }, [heatmap, offsetX, offsetY, roomPixelHeight, roomPixelWidth]);

  const renderZone = (zone: SnapZone) => {
    const guidanceTier = zoneGuidance?.[zone.id];
    const guidanceColor =
      guidanceTier === "best"
        ? COLORS.zoneBest
        : guidanceTier === "ok"
          ? COLORS.zoneOk
          : guidanceTier === "limited"
            ? COLORS.zoneLimited
            : null;
    const stroke = guidanceColor ?? (zone.disabled ? COLORS.zoneDisabled : COLORS.zone);
    const strokeWidth = guidanceColor ? 4 : zone.disabled ? 2 : 3;
    const dash = zone.disabled ? "4 4" : undefined;

    if (zone.geometry.kind === "segment") {
      return (
        <line
          key={zone.id}
          x1={toSvgX(zone.geometry.start.x)}
          y1={toSvgY(zone.geometry.start.y)}
          x2={toSvgX(zone.geometry.end.x)}
          y2={toSvgY(zone.geometry.end.y)}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={dash}
          strokeLinecap="round"
          pointerEvents="none"
        />
      );
    }

    const radius = guidanceColor ? 6 : zone.disabled ? 4 : 5;
    const fill = guidanceColor ?? stroke;
    return (
      <circle
        key={zone.id}
        cx={toSvgX(zone.geometry.at.x)}
        cy={toSvgY(zone.geometry.at.y)}
        r={radius}
        fill={fill}
        pointerEvents="none"
      />
    );
  };

  const renderTreatment = (treatment: Treatment) => {
    const zone = snapZones.find((item) => item.id === treatment.snapZoneId);
    if (!zone) {
      return null;
    }

    const position =
      zone.geometry.kind === "segment"
        ? {
          x: (zone.geometry.start.x + zone.geometry.end.x) / 2,
          y: (zone.geometry.start.y + zone.geometry.end.y) / 2,
        }
        : zone.geometry.at;
    const invalid = invalidTreatmentIds.has(treatment.id) || zone.disabled;
    const fill = COLORS.treatment[treatment.type];
    const opacity = invalid ? 0.4 : 1;

    return (
      <g key={treatment.id} opacity={opacity} pointerEvents="none">
        <rect
          x={toSvgX(position.x) - 10}
          y={toSvgY(position.y) - 10}
          width={20}
          height={20}
          rx={4}
          fill={fill}
          stroke={invalid ? "#8c8271" : "#ffffff"}
          strokeWidth={invalid ? 1 : 0}
        />
        <text
          x={toSvgX(position.x)}
          y={toSvgY(position.y)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="7"
          fill="#fff"
        >
          {treatment.type === "corner_trap" && "CT"}
          {treatment.type === "rear_wall_absorber" && "RA"}
          {treatment.type === "thick_panel" && "TP"}
          {treatment.type === "tuned_trap" && "TT"}
        </text>
      </g>
    );
  };

  const ghostSubList = ghostSubPlacements ?? [];
  const ghostSeatList = ghostSeatMoves ?? [];

  const renderGhostSubPlacement = (placement: GhostSubPlacement, index: number) => {
    const label = `Try ${index + 1}`;
    return (
      <g
        key={`ghost-sub-${index}`}
        onClick={() => onApplyGhostSubPlacement(placement)}
        style={{ cursor: "pointer" }}
      >
        <title>{placement.rationale}</title>
        <circle
          cx={toSvgX(placement.x)}
          cy={toSvgY(placement.y)}
          r={14}
          fill="none"
          stroke={COLORS.ghostSub}
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        <text
          x={toSvgX(placement.x)}
          y={toSvgY(placement.y)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="8"
          fill={COLORS.ghostSub}
        >
          {index + 1}
        </text>
        <text
          x={toSvgX(placement.x)}
          y={toSvgY(placement.y) + 18}
          textAnchor="middle"
          fontSize="9"
          fill={COLORS.ghostLabel}
        >
          {label}
        </text>
      </g>
    );
  };

  const renderGhostSeatMove = (move: SeatMicroMove) => (
    <g
      key={`ghost-seat-${move.label}`}
      onClick={() => onApplySeatMove(move)}
      style={{ cursor: "pointer" }}
    >
      <title>{move.label}</title>
      <circle
        cx={toSvgX(move.x)}
        cy={toSvgY(move.y)}
        r={12}
        fill="none"
        stroke={COLORS.ghostSeat}
        strokeWidth={2}
        strokeDasharray="4 3"
      />
      <text
        x={toSvgX(move.x)}
        y={toSvgY(move.y)}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="8"
        fill={COLORS.ghostSeat}
      >
        S
      </text>
      <text
        x={toSvgX(move.x)}
        y={toSvgY(move.y) + 18}
        textAnchor="middle"
        fontSize="9"
        fill={COLORS.ghostLabel}
      >
        {move.label}
      </text>
    </g>
  );

  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "18px" }}>Room Layout</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {heatmapRegion && (
            <span
              style={{
                fontSize: "12px",
                color: COLORS.label,
                padding: "4px 8px",
                backgroundColor: "#f4e4d2",
                borderRadius: "4px",
                fontWeight: 500,
              }}
            >
              Heatmap: {Math.round(heatmapRegion.low)}–{Math.round(heatmapRegion.high)} Hz
            </span>
          )}
          <span style={{ fontSize: "12px", color: COLORS.label }}>
            {room.width.toFixed(2)} m × {room.length.toFixed(2)} m
          </span>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: COLORS.label,
            }}
          >
            <input
              type="checkbox"
              checked={showRipples}
              onChange={(event) => onToggleRipples(event.target.checked)}
            />
            Ripples
          </label>
        </div>
      </div>
      <div
        ref={wrapperRef}
        style={{
          borderRadius: "16px",
          border: `1px solid ${COLORS.border}`,
          background: COLORS.background,
          padding: "16px",
        }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height={CANVAS_HEIGHT}
          role="img"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: "none" }}
        >
          <rect
            x={offsetX}
            y={offsetY}
            width={roomPixelWidth}
            height={roomPixelHeight}
            fill="none"
            stroke={COLORS.border}
            strokeWidth="2"
            rx="6"
          />
          {heatmapCells}
          {showRipples && (
            <g pointerEvents="none">
              {rippleSources.map((source, sourceIndex) => {
                const baseOpacity = 0.08 + source.intensity * 0.16;
                return (
                  <g
                    key={`ripple-${sourceIndex}`}
                    opacity={baseOpacity}
                    stroke={source.tone}
                  >
                    {rippleDelays.map((delay, ringIndex) => (
                      <circle
                        key={`ripple-${sourceIndex}-${ringIndex}`}
                        className="ripple-ring"
                        cx={toSvgX(source.x)}
                        cy={toSvgY(source.y)}
                        r={rippleBaseRadius}
                        strokeWidth={1}
                        style={{ animationDelay: `${delay}s` }}
                      />
                    ))}
                  </g>
                );
              })}
            </g>
          )}
          {snapZones.map(renderZone)}
          {treatments.map(renderTreatment)}
          {ghostSubList.map(renderGhostSubPlacement)}
          {ghostSeatList.map(renderGhostSeatMove)}
          {openingSegment && (
            <line
              x1={openingSegment.x1}
              y1={openingSegment.y1}
              x2={openingSegment.x2}
              y2={openingSegment.y2}
              stroke={COLORS.opening}
              strokeWidth="6"
              strokeLinecap="round"
            />
          )}
          <g
            key="seat-marker"
            onPointerDown={(event) => startDrag(event, "seat")}
            style={{ cursor: dragging?.target === "seat" ? "grabbing" : "grab" }}
          >
            <circle
              cx={toSvgX(seat.x)}
              cy={toSvgY(seat.y)}
              r={10}
              fill={COLORS.seat}
            />
            <text
              x={toSvgX(seat.x)}
              y={toSvgY(seat.y)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fill="#fff"
            >
              S
            </text>
          </g>
          {mains.enabled && (
            <>
              <g
                key="mains-left-marker"
                onPointerDown={(event) => startDrag(event, "mains-left")}
                style={{
                  cursor:
                    dragging?.target === "mains-left" ? "grabbing" : "grab",
                }}
              >
                <rect
                  x={toSvgX(mains.left.x) - 8}
                  y={toSvgY(mains.left.y) - 8}
                  width={16}
                  height={16}
                  rx={4}
                  fill={COLORS.mains}
                />
                <text
                  x={toSvgX(mains.left.x)}
                  y={toSvgY(mains.left.y)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fill="#fff"
                >
                  L
                </text>
              </g>
              <g
                key="mains-right-marker"
                onPointerDown={(event) => startDrag(event, "mains-right")}
                style={{
                  cursor:
                    dragging?.target === "mains-right" ? "grabbing" : "grab",
                }}
              >
                <rect
                  x={toSvgX(mains.right.x) - 8}
                  y={toSvgY(mains.right.y) - 8}
                  width={16}
                  height={16}
                  rx={4}
                  fill={COLORS.mains}
                />
                <text
                  x={toSvgX(mains.right.x)}
                  y={toSvgY(mains.right.y)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fill="#fff"
                >
                  R
                </text>
              </g>
            </>
          )}
          <g
            key="subwoofer-marker"
            onPointerDown={(event) => startDrag(event, "subwoofer")}
            style={{
              cursor: dragging?.target === "subwoofer" ? "grabbing" : "grab",
            }}
          >
            <circle
              cx={toSvgX(subwoofer.x)}
              cy={toSvgY(subwoofer.y)}
              r={12}
              fill={COLORS.sub}
            />
            <text
              x={toSvgX(subwoofer.x)}
              y={toSvgY(subwoofer.y)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="7"
              fill="#fff"
            >
              SUB
            </text>
          </g>
          {portContributionLabel && (
            <g pointerEvents="none">
              <rect
                x={toSvgX(subwoofer.x) - (portContributionLabel.length * 5.2) / 2 - 6}
                y={toSvgY(subwoofer.y) - 32}
                width={portContributionLabel.length * 5.2 + 12}
                height={16}
                rx={8}
                fill={COLORS.contributionPill}
                stroke={COLORS.contributionStroke}
                strokeWidth={1}
              />
              <text
                x={toSvgX(subwoofer.x)}
                y={toSvgY(subwoofer.y) - 20}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fill={COLORS.contributionText}
              >
                {portContributionLabel}
              </text>
            </g>
          )}
        </svg>
      </div>
    </section>
  );
}
