/**
 * The hero illustration: a Dublin terrace at dusk, with the bay, the Poolbeg
 * chimneys and the mountains behind. Pure SVG so it stays sharp and light.
 * Layers carry data-depth so the client can shift them for parallax.
 */

const DOORS = [
  "#c0392b",
  "#e0b23c",
  "#1f6f78",
  "#2f4fb0",
  "#2e6b4a",
  "#7a3b69",
  "#d9643a",
  "#1c2f5c",
  "#b8324f",
  "#3c7d5a",
  "#e0b23c",
  "#2f4fb0",
];
const BRICKS = [
  "#b9694f",
  "#a95c46",
  "#c47d5e",
  "#e9dccb",
  "#b06249",
  "#9f5540",
  "#c98a69",
  "#b9694f",
  "#e3d3c0",
  "#a95c46",
  "#bd7256",
  "#b06249",
];
const LIT = new Set([
  "0-1-0",
  "1-2-1",
  "3-1-1",
  "4-0-0",
  "6-2-0",
  "7-1-1",
  "9-1-0",
  "10-2-1",
  "2-0-1",
]);

const HOUSE_W = 132;
const GROUND = 560;

function House({ index }: { index: number }) {
  const x = index * HOUSE_W - 40;
  const brick = BRICKS[index % BRICKS.length];
  const door = DOORS[index % DOORS.length];
  const tall = index % 3 === 1 ? 14 : 0;
  const top = GROUND - 262 - tall;
  const doorLeft = index % 2 === 0;
  const doorX = x + (doorLeft ? 20 : HOUSE_W - 58);

  return (
    <g>
      {/* Chimney stack with pots */}
      <rect x={x + 8} y={top - 34} width={30} height={36} fill="#8a4a39" />
      {[0, 1, 2].map((p) => (
        <rect
          key={p}
          x={x + 11 + p * 9}
          y={top - 44}
          width={6}
          height={11}
          rx={1.5}
          fill="#d2805f"
        />
      ))}
      {/* Facade and parapet */}
      <rect x={x} y={top} width={HOUSE_W} height={GROUND - top} fill={brick} />
      <rect x={x} y={top} width={HOUSE_W} height={9} fill="#efe6da" />
      <rect
        x={x + HOUSE_W - 1.5}
        y={top}
        width={1.5}
        height={GROUND - top}
        fill="rgba(40,20,20,0.18)"
      />

      {/* Sash windows, shorter on each floor going up */}
      {[0, 1, 2].map((floor) =>
        [0, 1].map((col) => {
          // The ground-floor bay beside the door holds a single window
          if (floor === 2 && col === (doorLeft ? 0 : 1)) return null;
          const w = 30;
          const h = floor === 0 ? 40 : floor === 1 ? 56 : 60;
          const wy = top + 28 + floor * 78 + tall * (floor / 3);
          const wx = x + 22 + col * 58;
          const lit = LIT.has(`${index}-${floor}-${col}`);
          return (
            <g key={`${floor}-${col}`}>
              <rect
                x={wx - 3}
                y={wy - 3}
                width={w + 6}
                height={h + 6}
                fill="#f6efe6"
              />
              <rect
                x={wx}
                y={wy}
                width={w}
                height={h}
                fill={lit ? "#ffd98a" : "#3a4770"}
                className={lit ? "rp-window-lit" : undefined}
              />
              <path
                d={`M${wx + w / 2} ${wy}v${h}M${wx} ${wy + h / 2}h${w}`}
                stroke="#f6efe6"
                strokeWidth={2}
              />
            </g>
          );
        }),
      )}

      {/* Door with fanlight, surround and steps */}
      <path
        d={`M${doorX - 6} ${GROUND}V${GROUND - 70}a25 25 0 0 1 50 0V${GROUND}z`}
        fill="#f6efe6"
      />
      <path d={`M${doorX} ${GROUND - 70}a19 19 0 0 1 38 0z`} fill="#3a4770" />
      <path
        d={`M${doorX + 19} ${GROUND - 89}v19M${doorX + 6} ${GROUND - 83}l13 13M${doorX + 32} ${GROUND - 83}l-13 13`}
        stroke="#f6efe6"
        strokeWidth={1.5}
      />
      <rect x={doorX} y={GROUND - 66} width={38} height={66} fill={door} />
      <rect
        x={doorX + 5}
        y={GROUND - 60}
        width={28}
        height={24}
        fill="rgba(0,0,0,0.12)"
      />
      <rect
        x={doorX + 5}
        y={GROUND - 30}
        width={28}
        height={24}
        fill="rgba(0,0,0,0.12)"
      />
      <circle cx={doorX + 19} cy={GROUND - 34} r={2.6} fill="#e8c46a" />
    </g>
  );
}

function Cloud({
  x,
  y,
  scale,
  id,
}: {
  x: number;
  y: number;
  scale: number;
  id: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={`url(#${id})`}>
      <ellipse cx={0} cy={20} rx={150} ry={20} />
      <circle cx={-70} cy={0} r={38} />
      <circle cx={-20} cy={-28} r={52} />
      <circle cx={42} cy={-12} r={44} />
      <circle cx={92} cy={6} r={30} />
    </g>
  );
}

export default function HeroScene() {
  return (
    <svg
      className="rp-scene"
      viewBox="0 0 1440 600"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rp-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe9d2" />
          <stop offset="0.55" stopColor="#f6b9a8" />
          <stop offset="1" stopColor="#b7a6dc" />
        </linearGradient>
        <linearGradient id="rp-bay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3c7b4" />
          <stop offset="0.5" stopColor="#b9b6e6" />
          <stop offset="1" stopColor="#8e9bdc" />
        </linearGradient>
        <linearGradient id="rp-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c3b3e3" />
          <stop offset="1" stopColor="#a9a6dc" />
        </linearGradient>
      </defs>

      <g data-depth="0.15" className="rp-clouds">
        <Cloud id="rp-cloud" x={230} y={120} scale={1.25} />
        <Cloud id="rp-cloud" x={1230} y={150} scale={1.1} />
        <Cloud id="rp-cloud" x={760} y={70} scale={0.6} />
      </g>

      {/* Dublin mountains in three receding ranges */}
      <g data-depth="0.3">
        <path
          d="M0 330C120 300 210 250 330 262s190 52 300 40 180-78 300-70 170 70 270 62 150-50 240-40V480H0z"
          fill="url(#rp-far)"
        />
      </g>
      <g data-depth="0.45">
        <path
          d="M0 372c110-34 190-20 290-8s170-38 290-30 150 42 260 38 190-52 300-44 180 40 300 30V480H0z"
          fill="#8689cb"
        />
        <path
          d="M0 404c150-26 260-6 390-10s230-30 360-22 240 26 370 16 210-18 320-8V480H0z"
          fill="#5f68ad"
        />
      </g>

      {/* The bay, with the Poolbeg chimneys on the horizon */}
      <g data-depth="0.6">
        <rect x={0} y={420} width={1440} height={90} fill="url(#rp-bay)" />
        <g opacity={0.95}>
          {[1004, 1026].map((cx) => (
            <g key={cx}>
              <rect x={cx} y={338} width={7} height={84} fill="#f3ece4" />
              {[340, 352, 364].map((sy) => (
                <rect
                  key={sy}
                  x={cx}
                  y={sy}
                  width={7}
                  height={6}
                  fill="#c0392b"
                />
              ))}
            </g>
          ))}
          <rect x={980} y={412} width={74} height={10} fill="#4a528f" />
        </g>
        <path
          d="M0 470c200-22 380-6 560-12s300-20 500-12 250 14 380 6V520H0z"
          fill="#4e7a5c"
        />
        <path
          d="M0 492c240-18 420-4 640-8s360-12 800-2V530H0z"
          fill="#3b6349"
        />
      </g>

      {/* The terrace */}
      <g data-depth="1" className="rp-terrace">
        {Array.from({ length: 12 }, (_, i) => (
          <House key={i} index={i} />
        ))}
        <rect x={-40} y={GROUND} width={1560} height={40} fill="#2c3554" />
        {/* Railings */}
        <g stroke="#1c2340" strokeWidth={2}>
          <path d="M-40 532H1520" />
          {Array.from({ length: 130 }, (_, i) => (
            <path key={i} d={`M${-40 + i * 12} 526V560`} />
          ))}
        </g>
      </g>
    </svg>
  );
}
