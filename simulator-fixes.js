(function () {
    "use strict";

    const DEFAULT_STOCKS = [
        { id: 1, name: "Socapalm", sector: "Agro-industrie", price: 25000, div: 2325, growth: 5.2, startYear: 2015 },
        { id: 2, name: "Safacam", sector: "Agro-industrie", price: 22000, div: 2200, growth: 4.8, startYear: 2015 },
        { id: 3, name: "SEMC", sector: "Agroalimentaire", price: 10000, div: 600, growth: 3.5, startYear: 2015 },
        { id: 4, name: "La Régionale", sector: "Banque / MF", price: 42000, div: 0, growth: 0, startYear: 2021 },
        { id: 5, name: "Bange Bank", sector: "Secteur Bancaire", price: 206000, div: 4830, growth: 2, startYear: 2022 },
        { id: 6, name: "SCG-Ré", sector: "Assurance", price: 12000, div: 510, growth: 6.2, startYear: 2023 }
    ];

    const readNumber = id => {
        const value = document.getElementById(id).value.trim();
        return value === "" ? NaN : Number(value);
    };

    function validationError() {
        const capital = readNumber("capitalInitial");
        const tax = readNumber("tauxIRCM");
        const fees = readNumber("fraisCourtage");
        const riskFree = readNumber("tauxSansRisque");
        const reinvest = Number(document.getElementById("tauxReinvest").value);
        const delay = Number(document.getElementById("delaiSlippage").value);

        if (!Number.isFinite(capital) || capital <= 0) return "Le capital initial doit être supérieur à zéro.";
        if (!Number.isFinite(tax) || tax < 0 || tax > 100) return "Le taux IRCM doit être compris entre 0 et 100 %.";
        if (!Number.isFinite(fees) || fees < 0 || fees > 100) return "Les frais doivent être compris entre 0 et 100 %.";
        if (!Number.isFinite(riskFree) || riskFree < 0 || riskFree > 100) return "Le taux sans risque doit être compris entre 0 et 100 %.";
        if (!Number.isFinite(reinvest) || reinvest < 0 || reinvest > 1) return "Le réinvestissement doit être compris entre 0 et 100 %.";
        if (!Number.isFinite(delay) || delay < 0) return "Le délai d'exécution doit être positif.";
        if (!Array.isArray(stocks) || !stocks.length) return "Ajoutez au moins une société.";
        if (!stocks.some(stock => Number(stock.startYear) === 2015)) return "Au moins une société doit être cotée en 2015 pour initialiser le portefeuille.";

        for (const stock of stocks) {
            if (!stock.name || !stock.sector || !Number.isFinite(Number(stock.price)) || Number(stock.price) <= 0 ||
                !Number.isFinite(Number(stock.div)) || Number(stock.div) < 0 ||
                !Number.isFinite(Number(stock.growth)) || Number(stock.growth) <= -100 ||
                !Number.isInteger(Number(stock.startYear)) || Number(stock.startYear) < 2015 || Number(stock.startYear) > 2025) {
                return `Données invalides pour l'action « ${stock.name || "sans nom"} ».`;
            }
        }

        return null;
    }

    function stockPrice(stock, year) {
        return Number(stock.price) * Math.pow(1 + Number(stock.growth) * 0.008, year - Number(stock.startYear));
    }

    window.runSimulation = function () {
        const error = validationError();
        if (error) {
            window.alert(error);
            return;
        }

        const capital = readNumber("capitalInitial");
        const taxRate = readNumber("tauxIRCM") / 100;
        const feeRate = readNumber("fraisCourtage") / 100;
        const riskFree = readNumber("tauxSansRisque") / 100;
        const reinvestRate = Number(document.getElementById("tauxReinvest").value);
        const delay = Number(document.getElementById("delaiSlippage").value);

        const years = Array.from({ length: 11 }, (_, i) => 2015 + i);
        const initialStocks = stocks.filter(stock => Number(stock.startYear) === 2015);
        const sharesA = Object.create(null);
        const sharesB = Object.create(null);
        let cashA = 0;
        let cashB = 0;

        stocks.forEach(stock => {
            sharesA[stock.id] = 0;
            sharesB[stock.id] = 0;
        });

        const allocation = capital / initialStocks.length;
        initialStocks.forEach(stock => {
            const quantity = Math.floor(allocation / (Number(stock.price) * (1 + feeRate)));
            const remainder = allocation - quantity * Number(stock.price) * (1 + feeRate);
            sharesA[stock.id] = quantity;
            sharesB[stock.id] = quantity;
            cashA += remainder;
            cashB += remainder;
        });

        const portfolioValue = (shares, cash, year) => cash + stocks.reduce((sum, stock) => {
            return sum + (shares[stock.id] || 0) * stockPrice(stock, year);
        }, 0);

        const history = [{
            year: 2015,
            wealthA: Math.round(portfolioValue(sharesA, cashA, 2015)),
            wealthB: Math.round(portfolioValue(sharesB, cashB, 2015)),
            diffAbs: 0, surperf: 0, divNetB: 0, newSharesB: 0
        }];

        for (let year = 2016; year <= 2025; year++) {
            let dividendsA = 0;
            let dividendsB = 0;

            stocks.forEach(stock => {
                if (Number(stock.startYear) <= year) {
                    const netDividend = Number(stock.div) * Math.pow(1 + Number(stock.growth) / 100, year - Number(stock.startYear)) * (1 - taxRate);
                    dividendsA += (sharesA[stock.id] || 0) * netDividend;
                    dividendsB += (sharesB[stock.id] || 0) * netDividend;
                }
            });

            cashA += dividendsA;

            const newListings = stocks.filter(stock => Number(stock.startYear) === year);
            for (const stock of newListings) {
                const totalAvailable = stocks.filter(item => Number(item.startYear) <= year).length;
                const investableA = cashA / totalAvailable;
                const investableB = cashB / totalAvailable;
                const listingPrice = stockPrice(stock, year);
                const qtyA = Math.floor(investableA / (listingPrice * (1 + feeRate)));
                const qtyB = Math.floor(investableB / (listingPrice * (1 + feeRate)));
                sharesA[stock.id] += qtyA;
                sharesB[stock.id] += qtyB;
                cashA -= qtyA * listingPrice * (1 + feeRate);
                cashB -= qtyB * listingPrice * (1 + feeRate);
            }

            const available = cashB + dividendsB;
            const budget = available * reinvestRate;
            const eligible = stocks.filter(stock => Number(stock.startYear) <= year && Number(stock.div) > 0);
            let spent = 0;
            let newShares = 0;

            if (eligible.length && budget > 0) {
                const perStock = budget / eligible.length;
                eligible.forEach(stock => {
                    const executionPrice = stockPrice(stock, year) * (1 + delay * 0.003);
                    const quantity = Math.floor(perStock / (executionPrice * (1 + feeRate)));
                    if (quantity > 0) {
                        sharesB[stock.id] += quantity;
                        spent += quantity * executionPrice * (1 + feeRate);
                        newShares += quantity;
                    }
                });
            }

            cashB = available - spent;

            const wealthA = portfolioValue(sharesA, cashA, year);
            const wealthB = portfolioValue(sharesB, cashB, year);

            history.push({
                year,
                wealthA: Math.round(wealthA),
                wealthB: Math.round(wealthB),
                diffAbs: Math.round(wealthB - wealthA),
                surperf: wealthA > 0 ? (wealthB / wealthA - 1) * 100 : 0,
                divNetB: Math.round(dividendsB),
                newSharesB: newShares
            });
        }

        const finalA = history.at(-1).wealthA;
        const finalB = history.at(-1).wealthB;
        const elapsedYears = years.at(-1) - years[0];

        const cagrA = finalA > 0 ? (Math.pow(finalA / capital, 1 / elapsedYears) - 1) * 100 : -100;
        const cagrB = finalB > 0 ? (Math.pow(finalB / capital, 1 / elapsedYears) - 1) * 100 : -100;

        const returnsA = history.slice(1).map((row, i) => row.wealthA / history[i].wealthA - 1);
        const returnsB = history.slice(1).map((row, i) => row.wealthB / history[i].wealthB - 1);

        const stdDev = values => {
            if (values.length < 2) return 0;
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
        };

        const downsideDeviation = values => {
            if (!values.length) return 0;
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const downside = values.map(value => Math.min(0, value - riskFree));
            return Math.sqrt(downside.reduce((sum, value) => sum + (value - mean) ** 2, 0) / downside.length);
        };

        const sharpe = (returnRate, vol) => vol > 0 ? returnRate / vol : 0;
        const maxDrawdown = key => {
            let peak = history[0][key];
            let max = 0;
            history.forEach(row => {
                peak = Math.max(peak, row[key]);
                if (peak > 0) max = Math.max(max, (peak - row[key]) / peak);
            });
            return max * 100;
        };

        lastSimulationResults = {
            historyData: history,
            finalA,
            finalB,
            cagrA,
            cagrB,
            volA: stdDev(returnsA) * 100,
            volB: stdDev(returnsB) * 100,
            sharpeA: sharpe(cagrA / 100 - riskFree, stdDev(returnsA)),
            sharpeB: sharpe(cagrB / 100 - riskFree, stdDev(returnsB)),
            sortinoA: sharpe(cagrA / 100 - riskFree, downsideDeviation(returnsA)),
            sortinoB: sharpe(cagrB / 100 - riskFree, downsideDeviation(returnsB)),
            maxDDA: maxDrawdown("wealthA"),
            maxDDB: maxDrawdown("wealthB")
        };

        updateDashboardUI(lastSimulationResults);
    };

    const renderDashboard = window.updateDashboardUI;
    window.updateDashboardUI = function (results) {
        if (typeof renderDashboard === "function") renderDashboard(results);

        const surperf = (results.finalB / results.finalA * 100 - 100);
        document.getElementById("kpiSurperf").textContent = `${surperf >= 0 ? "+" : ""}${surperf.toFixed(2)}%`;
        document.getElementById("kpiEcartCAGR").textContent = `${results.cagrB - results.cagrA >= 0 ? "+" : ""}${(results.cagrB - results.cagrA).toFixed(2)} pts`;

        const rows = document.querySelectorAll("#backtestTableBody tr");
        results.historyData.forEach((row, index) => {
            const cells = rows[index]?.children;
            if (!cells) return;
            cells[3].textContent = `${row.diffAbs > 0 ? "+" : ""}${row.diffAbs.toLocaleString()} FCFA`;
            cells[4].textContent = `${row.surperf > 0 ? "+" : ""}${Number(row.surperf).toFixed(2)}%`;
            cells[4].classList.toggle("text-red-700", row.surperf < 0);
            cells[4].classList.toggle("text-emerald-800", row.surperf >= 0);
        });
    };

    window.saveStock = function () {
        const name = document.getElementById("modalStockName").value.trim();
        const sector = document.getElementById("modalStockSector").value.trim();
        const price = Number(document.getElementById("modalStockPrice").value);
        const div = Number(document.getElementById("modalStockDiv").value);
        const growth = Number(document.getElementById("modalStockGrowth").value);
        const startYear = Number(document.getElementById("modalStockYear").value);

        if (!name || !sector || !Number.isFinite(price) || price <= 0 || !Number.isFinite(div) || div < 0 ||
            !Number.isFinite(growth) || growth <= -100 || !Number.isInteger(startYear) || startYear < 2015 || startYear > 2025) {
            window.alert("Vérifiez les données de l'action.");
            return;
        }

        if (stocks.some(stock => stock.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
            window.alert("Cette société existe déjà.");
            return;
        }

        stocks.push({ id: Date.now(), name, sector, price, div, growth, startYear });
        renderStockTable();
        closeStockModal();
        runSimulation();
    };

    window.resetDefaults = function () {
        document.getElementById("capitalInitial").value = 10000000;
        document.getElementById("tauxIRCM").value = 16.5;
        document.getElementById("fraisCourtage").value = 1.5;
        document.getElementById("tauxSansRisque").value = 4.5;
        document.getElementById("tauxReinvest").value = "1.0";
        document.getElementById("delaiSlippage").value = "1";
        stocks = DEFAULT_STOCKS.map(stock => ({ ...stock }));
        renderStockTable();
        runSimulation();
    };
})();
