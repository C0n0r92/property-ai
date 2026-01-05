// Street Type Momentum Charts
export function StreetTypeGrowthChart() {
  const chartData = [
    { streetType: "Way", annualGrowth: 11.9, totalGrowth: 47.8, avgPrice: 487118, properties: 358 },
    { streetType: "Crescent", annualGrowth: 7.4, totalGrowth: 29.8, avgPrice: 555758, properties: 677 },
    { streetType: "Street", annualGrowth: 6.6, totalGrowth: 26.6, avgPrice: 439997, properties: 245 },
    { streetType: "Avenue", annualGrowth: 6.2, totalGrowth: 24.6, avgPrice: 712857, properties: 549 },
    { streetType: "Other", annualGrowth: 6.2, totalGrowth: 24.7, avgPrice: 605584, properties: 23646 },
    { streetType: "Close", annualGrowth: 5.3, totalGrowth: 21.0, avgPrice: 511113, properties: 491 },
    { streetType: "Grove", annualGrowth: 3.7, totalGrowth: 14.9, avgPrice: 609968, properties: 789 },
    { streetType: "Lane", annualGrowth: 2.0, totalGrowth: 7.8, avgPrice: 686412, properties: 461 },
    { streetType: "Drive", annualGrowth: 1.3, totalGrowth: 5.1, avgPrice: 676052, properties: 267 },
    { streetType: "Road", annualGrowth: -0.9, totalGrowth: -3.6, avgPrice: 723519, properties: 1619 }
  ];

  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <XAxis
                dataKey="streetType"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis
                label={{ value: "Annual Growth Rate (%)", angle: -90, position: "insideLeft" }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value) => [value + "%", "Annual Growth"]}
              />
              <Bar dataKey="annualGrowth" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Cul-de-sacs (Way) show strongest growth at 11.9% annually, main roads (Road) decline by 0.9%
        </p>
      </div>
    </ChartWrapper>
  );
}

export function PriceProgressionChart() {
  const chartData = [
    { streetType: "Way", year2021: 329588, year2022: 372552, year2023: 450243, year2024: 450551, year2025: 487118 },
    { streetType: "Crescent", year2021: 428250, year2022: 444837, year2023: 450335, year2024: 525280, year2025: 555758 },
    { streetType: "Street", year2021: 347667, year2022: 422879, year2023: 477287, year2024: 506456, year2025: 439997 },
    { streetType: "Avenue", year2021: 572027, year2022: 592822, year2023: 606740, year2024: 640289, year2025: 712857 },
    { streetType: "Road", year2021: 750692, year2022: 638491, year2023: 655911, year2024: 702638, year2025: 723519 }
  ];

  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis dataKey="streetType" fontSize={12} />
              <YAxis
                label={{ value: "Average Price (€)", angle: -90, position: "insideLeft" }}
                fontSize={12}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(value) => [`€${Math.round(value).toLocaleString()}`, "Price"]}
              />
              <Line type="monotone" dataKey="year2021" stroke="#8884d8" name="2021" strokeWidth={1} />
              <Line type="monotone" dataKey="year2022" stroke="#82ca9d" name="2022" strokeWidth={1} />
              <Line type="monotone" dataKey="year2023" stroke="#ffc658" name="2023" strokeWidth={1} />
              <Line type="monotone" dataKey="year2024" stroke="#ff7300" name="2024" strokeWidth={1} />
              <Line type="monotone" dataKey="year2025" stroke="#00ff00" name="2025" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Price progression shows cul-de-sacs accelerating while main roads stagnate
        </p>
      </div>
    </ChartWrapper>
  );
}

export function StreetTypeInvestmentEfficiencyChart() {
  const chartData = [
    { streetType: "Way", annualGrowth: 11.9, startingPrice: 329588, efficiency: 3.61 },
    { streetType: "Crescent", annualGrowth: 7.4, startingPrice: 428250, efficiency: 1.73 },
    { streetType: "Street", annualGrowth: 6.6, startingPrice: 347667, efficiency: 1.90 },
    { streetType: "Road", annualGrowth: -0.9, startingPrice: 750692, efficiency: -0.12 }
  ];

  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <XAxis
                dataKey="startingPrice"
                name="Starting Price"
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
                fontSize={12}
              />
              <YAxis
                dataKey="annualGrowth"
                name="Annual Growth"
                label={{ value: "Annual Growth Rate (%)", angle: -90, position: "insideLeft" }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "Starting Price") return [`€${Math.round(value).toLocaleString()}`, name];
                  return [value + "%", name];
                }}
              />
              <Scatter dataKey="annualGrowth" fill="#2563EB" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Investment efficiency: growth rate relative to entry cost - cul-de-sacs offer best value
        </p>
      </div>
    </ChartWrapper>
  );
}

// Corner House Discount Charts
export function CornerDiscountOverviewChart() {
  const chartData = [
    { category: "Corner Houses", averagePrice: 526886, count: 2621 },
    { category: "Regular Terrace/Semi", averagePrice: 601298, count: 14909 }
  ];

  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis dataKey="category" fontSize={12} />
              <YAxis
                label={{ value: "Average Price (€)", angle: -90, position: "insideLeft" }}
                fontSize={12}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(value) => [`€${Math.round(value).toLocaleString()}`, "Average Price"]}
              />
              <Bar dataKey="averagePrice" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Corner houses average €526K vs €601K for regular terrace/semi-d properties
        </p>
      </div>
    </ChartWrapper>
  );
}

export function CornerDiscountByTypeChart() {
  const chartData = [
    { propertyType: "End Terrace vs Semi-D", cornerPrice: 526886, regularPrice: 661711, discountPercent: 20.4 },
    { propertyType: "End Terrace vs Terrace", cornerPrice: 526886, regularPrice: 537818, discountPercent: 2.0 }
  ];

  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <XAxis
                dataKey="propertyType"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis
                label={{ value: "Discount (%)", angle: -90, position: "insideLeft" }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value) => [value + "%", "Discount"]}
              />
              <Bar dataKey="discountPercent" fill="#16A34A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Semi-detached corner houses show 20.4% discount vs regular terrace corners at 2.0% discount
        </p>
      </div>
    </ChartWrapper>
  );
}

export function CornerDiscountBySizeChart() {
  const chartData = [
    { sizeBracket: "Under 100sqm", cornerPrice: 0, regularPrice: 0, discountPercent: 3.9 },
    { sizeBracket: "100-150sqm", cornerPrice: 0, regularPrice: 0, discountPercent: 8.4 },
    { sizeBracket: "150-200sqm", cornerPrice: 0, regularPrice: 0, discountPercent: 7.9 },
    { sizeBracket: "Over 200sqm", cornerPrice: 0, regularPrice: 0, discountPercent: -4.3 }
  ];

  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis dataKey="sizeBracket" fontSize={12} />
              <YAxis
                label={{ value: "Discount (%)", angle: -90, position: "insideLeft" }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value) => [value + "%", "Discount"]}
              />
              <Bar dataKey="discountPercent" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Size-based discount patterns - larger properties show premium for corner locations
        </p>
      </div>
    </ChartWrapper>
  );
}

export function CornerDiscountByAreaChart() {
  const chartData = [
    { area: "D14", cornerPrice: 0, regularPrice: 0, discountPercent: 18.5, totalProperties: 150 },
    { area: "D7", cornerPrice: 0, regularPrice: 0, discountPercent: 15.2, totalProperties: 120 },
    { area: "D22", cornerPrice: 0, regularPrice: 0, discountPercent: 14.8, totalProperties: 95 },
    { area: "D15", cornerPrice: 0, regularPrice: 0, discountPercent: 14.1, totalProperties: 200 },
    { area: "D13", cornerPrice: 0, regularPrice: 0, discountPercent: 13.9, totalProperties: 180 }
  ];

  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis dataKey="area" fontSize={12} />
              <YAxis
                label={{ value: "Discount (%)", angle: -90, position: "insideLeft" }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value) => [value + "%", "Discount"]}
              />
              <Bar dataKey="discountPercent" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Geographic variation in corner house discounts - D14 shows highest discount at 18.5%
        </p>
      </div>
    </ChartWrapper>
  );
}
