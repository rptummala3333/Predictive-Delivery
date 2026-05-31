const root = document.documentElement;
const themeToggle = document.querySelector("#themeToggle");
const forecastInputs = {
  demand: document.querySelector("#demandRange"),
  weather: document.querySelector("#weatherRange"),
  capacity: document.querySelector("#capacityRange"),
  region: document.querySelector("#regionSelect"),
};

const routeData = [
  { lane: "Chicago → Detroit", eta: "1.2d", risk: 18, volume: 842, status: "Clear" },
  { lane: "Dallas → Austin", eta: "0.7d", risk: 24, volume: 621, status: "Clear" },
  { lane: "Newark → Boston", eta: "1.6d", risk: 47, volume: 994, status: "Watch" },
  { lane: "Atlanta → Miami", eta: "1.9d", risk: 59, volume: 738, status: "Watch" },
  { lane: "Los Angeles → Phoenix", eta: "2.1d", risk: 71, volume: 518, status: "Act" },
  { lane: "Seattle → Portland", eta: "1.1d", risk: 34, volume: 456, status: "Clear" },
];

function cssVar(name) {
  return getComputedStyle(root).getPropertyValue(name).trim();
}

function setupCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function drawLineChart(canvas, values, options = {}) {
  const { ctx, width, height } = setupCanvas(canvas);
  const pad = 28;
  const chartWidth = width - pad * 2;
  const chartHeight = height - pad * 2;
  const min = Math.min(...values) - 4;
  const max = Math.max(...values) + 4;
  const green = cssVar("--green");
  const blue = cssVar("--blue");
  const muted = cssVar("--muted");
  const line = cssVar("--line");

  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = 1;
  ctx.strokeStyle = line;
  for (let i = 0; i < 5; i += 1) {
    const y = pad + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
  }

  const points = values.map((value, index) => {
    const x = pad + (chartWidth / (values.length - 1)) * index;
    const y = pad + chartHeight - ((value - min) / (max - min)) * chartHeight;
    return { x, y, value };
  });

  const gradient = ctx.createLinearGradient(0, pad, 0, height - pad);
  gradient.addColorStop(0, `${green}55`);
  gradient.addColorStop(1, `${green}00`);

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.lineTo(width - pad, height - pad);
  ctx.lineTo(pad, height - pad);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = options.accent || green;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  if (options.secondary) {
    const secondaryPoints = options.secondary.map((value, index) => {
      const x = pad + (chartWidth / (options.secondary.length - 1)) * index;
      const y = pad + chartHeight - ((value - min) / (max - min)) * chartHeight;
      return { x, y };
    });
    ctx.beginPath();
    secondaryPoints.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = blue;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  points.forEach((point, index) => {
    if (index % 2 !== 0) return;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = cssVar("--surface");
    ctx.fill();
    ctx.strokeStyle = options.accent || green;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  ctx.fillStyle = muted;
  ctx.font = "700 12px Inter, system-ui, sans-serif";
  ctx.fillText(options.leftLabel || "7 days", pad, height - 5);
  ctx.textAlign = "right";
  ctx.fillText(options.rightLabel || "Today", width - pad, height - 5);
  ctx.textAlign = "left";
}

function calculateForecast() {
  const demand = Number(forecastInputs.demand.value);
  const weather = Number(forecastInputs.weather.value);
  const capacity = Number(forecastInputs.capacity.value);
  const regionAdjustments = {
    north: 4,
    south: 8,
    coastal: 12,
    metro: 16,
  };
  const regionRisk = regionAdjustments[forecastInputs.region.value];
  const risk = Math.max(8, Math.min(92, Math.round(demand * 0.42 + weather * 0.38 - capacity * 0.22 + regionRisk)));
  const reliability = Math.max(54, Math.round(102 - risk * 0.62));
  const values = [reliability - 3, reliability - 1, reliability + 2, reliability - 4, reliability + 1, reliability + 3, reliability];
  const baseline = values.map((value, index) => value - 3 + Math.sin(index) * 2);

  return { risk, reliability, values, baseline };
}

function updateForecast() {
  document.querySelector("#demandOutput").textContent = forecastInputs.demand.value;
  document.querySelector("#weatherOutput").textContent = forecastInputs.weather.value;
  document.querySelector("#capacityOutput").textContent = forecastInputs.capacity.value;

  const { risk, reliability, values, baseline } = calculateForecast();
  const riskScore = document.querySelector("#riskScore");
  const riskStatus = document.querySelector("#riskStatus");
  const recommendation = document.querySelector("#recommendationText");
  riskScore.textContent = risk;

  riskStatus.className = "status";
  if (risk < 34) {
    riskStatus.textContent = "Low";
    riskStatus.classList.add("good");
    recommendation.textContent = "Keep current carrier allocation and protect early pickup capacity.";
  } else if (risk < 62) {
    riskStatus.textContent = "Moderate";
    recommendation.textContent = "Shift 12% of Zone 3 volume to early pickup windows.";
  } else {
    riskStatus.textContent = "High";
    riskStatus.classList.add("high");
    recommendation.textContent = "Trigger exception review and rebalance volume across backup carriers.";
  }

  document.querySelector("#healthScore").textContent = `${Math.max(72, reliability + 4)}%`;
  document.querySelector("#onTimeMetric").textContent = `${reliability}.8%`;
  document.querySelector("#riskMetric").textContent = Math.round(60 + risk * 2.8);
  document.querySelector("#speedMetric").textContent = `${(2.3 - reliability / 100).toFixed(1)}d`;
  document.querySelector("#costMetric").textContent = `${risk > 62 ? "+" : "-"}${Math.abs((12 - risk / 8).toFixed(1))}%`;

  drawLineChart(document.querySelector("#forecastChart"), values, {
    secondary: baseline,
    leftLabel: "Projected week",
    rightLabel: `${reliability}% reliable`,
  });
  drawLineChart(document.querySelector("#heroChart"), [88, 90, 89, 93, 92, reliability, reliability + 2], {
    accent: cssVar("--green"),
    leftLabel: "Network",
    rightLabel: "Live model",
  });
}

function renderRoutes() {
  const grid = document.querySelector("#routeGrid");
  grid.innerHTML = routeData
    .map((route) => {
      const tone = route.risk > 65 ? "bad" : route.risk > 42 ? "warn" : "";
      const statusClass = route.risk > 65 ? "high" : route.risk > 42 ? "" : "good";
      return `
        <article class="route-card">
          <div class="route-top">
            <strong>${route.lane}</strong>
            <span class="status ${statusClass}">${route.status}</span>
          </div>
          <div class="route-map" aria-hidden="true">
            <span class="route-line ${tone}"></span>
          </div>
          <div class="route-bottom">
            <span><strong>${route.eta}</strong> ETA</span>
            <span><strong>${route.risk}%</strong> risk</span>
            <span><strong>${route.volume}</strong> orders</span>
          </div>
        </article>
      `;
    })
    .join("");
}

themeToggle.addEventListener("click", () => {
  const isDark = root.dataset.theme === "dark";
  root.dataset.theme = isDark ? "light" : "dark";
  themeToggle.querySelector("span").textContent = isDark ? "☾" : "☀";
  updateForecast();
});

Object.values(forecastInputs).forEach((input) => input.addEventListener("input", updateForecast));
window.addEventListener("resize", updateForecast);

renderRoutes();
updateForecast();
