<div align="center">

<img src="assets/logo.png" alt="Time Buddy Logo" width="180" height="180">

# Time Buddy

**Your time series metric agent**

[![Release](https://img.shields.io/github/v/release/Liquescent-Development/grafana-query-ide?style=flat-square)](https://github.com/Liquescent-Development/grafana-query-ide/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=flat-square)](https://github.com/Liquescent-Development/grafana-query-ide/releases)
[![License](https://img.shields.io/github/license/Liquescent-Development/grafana-query-ide?style=flat-square)](LICENSE)

*A powerful desktop IDE for modern time series query development with VS Code-like interface, AI-powered analytics, and seamless Grafana integration*

[📥 Download](https://github.com/Liquescent-Development/grafana-query-ide/releases) • [🚀 Quick Start](#-quick-start) • [📖 Documentation](#-features)

</div>

---

## 🎯 Why Choose Time Buddy?

**Stop switching between browser tabs.** Build and debug time series queries in a dedicated desktop environment designed for developers.

- 🖥️ **Native desktop app** - No more browser limitations
- 🧠 **AI-powered analytics** - Intelligent anomaly detection with visual analysis
- 🔍 **Smart schema explorer** - Click-to-insert with real-time discovery
- ⚡ **Advanced editor** - Syntax highlighting, autocomplete, and validation
- 📊 **Multiple visualizations** - Tables, charts, and log scale support
- 🗃️ **Connection management** - Securely manage multiple Grafana instances

## ✨ Features

### 🧠 **AI/ML Analytics** (New!)
- **Intelligent anomaly detection** powered by Ollama or OpenAI
- **Multiple AI providers** - Local Ollama models or cloud OpenAI API
- **Visual analysis mode** with chart-based AI insights  
- **Dynamic model selection** from available models
- **Time series preprocessing** with intelligent data subsampling
- **Saved analyses** for tracking anomaly patterns over time

### 🖥️ **Professional Query Environment**
- **VS Code-like interface** with tabbed editing and syntax highlighting
- **PromQL & InfluxQL support** with 40+ autocomplete functions
- **Real-time validation** and intelligent error detection
- **Multi-tab workflow** for complex query development
- **File system integration** - save/load .promql and .isql files

### 🔍 **Smart Data Discovery**
- **Interactive schema explorer** with click-to-insert functionality
- **Dynamic variable system** for reusable query components
- **Dashboard explorer** to extract and analyze existing queries
- **Connection-aware caching** for fast schema browsing

### 📊 **Advanced Visualization**
- **Multiple chart types** - line, bar, scatter plots with Chart.js
- **Log scale support** for handling extreme value ranges
- **Series management** for GROUP BY results
- **Export capabilities** for external analysis

### 🔐 **Enterprise-Ready**
- **Secure connection management** (passwords never stored)
- **SOCKS5 proxy support** for secure environments
- **Self-signed SSL handling** 
- **Cross-platform compatibility** (macOS, Windows, Linux)

## 📥 Quick Start

### Download & Install
1. **Download** the latest release for your platform:
   - [macOS](https://github.com/Liquescent-Development/grafana-query-ide/releases) (Intel & Apple Silicon)
   - [Windows](https://github.com/Liquescent-Development/grafana-query-ide/releases) (.exe installer)
   - [Linux](https://github.com/Liquescent-Development/grafana-query-ide/releases) (AppImage)

2. **Install** and launch the application

3. **Connect** to your Grafana instance:
   - Click "+" in Connections panel
   - Enter Grafana URL and credentials
   - Select your data source

4. **Start querying** with full autocomplete and syntax highlighting!

### AI Analytics Setup (Optional)

**Option 1: Local AI with Ollama**
1. **Install Ollama** from [ollama.ai](https://ollama.ai)
2. **Pull a model**: `ollama pull llama3.2`
3. **Configure Ollama connection** in the app with your local endpoint
4. **Enable visual analysis** for intelligent anomaly detection

**Option 2: Cloud AI with OpenAI**
1. **Get OpenAI API key** from [platform.openai.com](https://platform.openai.com)
2. **Configure OpenAI connection** in the app with your API key
3. **Select model** from available options (GPT-4, GPT-3.5-turbo, etc.)
4. **Run AI analysis** with cloud-powered insights

## 🛠️ Development

```bash
# Clone and install
git clone https://github.com/Liquescent-Development/grafana-query-ide.git
cd time-buddy
npm install

# Development mode
npm run electron-dev

# Build for all platforms  
npm run build-all
```

## 🧪 Testing

Time Buddy features a comprehensive test suite with **187 tests** covering all core functionality, providing confidence in code quality and reliability.

### Test Suite Highlights

✅ **187 Comprehensive Tests** across all modules  
✅ **Professional CLI Test Runner** with Node.js compatibility  
✅ **Browser-Based Test Runner** for complete debugging  
✅ **CI/CD Integration** ready with proper exit codes  
✅ **Cross-Platform Testing** on Windows, macOS, and Linux  

### Running Tests

```bash
# Run all tests (recommended)
npm test

# Run only unit tests (fast feedback)
npm run test:unit

# Run only integration tests  
npm run test:integration

# Run with detailed output for debugging
npm run test:verbose

# Watch mode for continuous testing during development
npm run test:watch
```

### Test Coverage

The test suite provides comprehensive coverage across:

- **Core modules** - DataAccess layer, QueryRequestBuilder, error handling
- **Integration tests** - Module interactions, API compatibility, data flow  
- **Error scenarios** - Network failures, authentication errors, malformed data
- **Performance** - Memory usage, concurrent operations, large datasets
- **Cross-platform** - Windows, macOS, and Linux compatibility

### Development Workflow

1. **During development** - Use `npm run test:watch` for continuous feedback
2. **Before commits** - Run `npm test` to ensure all tests pass  
3. **Debugging issues** - Use browser runner `tests/test-runner.html` for complete validation
4. **Quick iterations** - Use `npm run test:unit` for fast feedback loops
5. **CI/CD integration** - Automated testing on pull requests and deployments

### Test Architecture

- **Dual execution modes** - CLI runner for CI/CD, browser runner for debugging
- **Professional framework** - Custom test runner with describe/it syntax
- **Jest-style mocking** - Professional mock system with call tracking
- **Comprehensive fixtures** - Realistic test data and mock responses
- **Cross-platform** - Works on Windows, macOS, and Linux
- **187 total tests** covering every aspect of the application

### Test Categories

**Unit Tests:**
- DataAccess unified request handling
- QueryRequestBuilder for Prometheus/InfluxDB
- Error handling and data processing

**Integration Tests:**  
- queries.js module integration
- schema.js data loading
- analytics.js AI/ML functionality
- variables.js dynamic query building

**Error Scenario Tests:**
- Network timeouts and connection failures
- Authentication and authorization errors
- Malformed data and edge cases
- Cross-browser compatibility issues

For detailed testing documentation, see [`tests/TESTING_GUIDE.md`](/tests/TESTING_GUIDE.md) and [`docs/CI-CD-TESTING.md`](/docs/CI-CD-TESTING.md).

## 📚 Example Queries

**PromQL (Prometheus)**
```promql
# CPU usage with rate calculation
rate(cpu_usage_seconds_total[5m])

# Memory usage by container
sum(container_memory_usage_bytes) by (container_name)
```

**InfluxQL (InfluxDB)**
```sql
-- Temperature trends over time
SELECT mean("temperature") FROM "sensors" 
WHERE time > now() - 1h GROUP BY time(5m)
```

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Execute Query | `Ctrl/Cmd + Enter` |
| Save Query | `Ctrl/Cmd + S` |
| New Tab | `Ctrl/Cmd + N` |
| Auto-complete | `Ctrl + Space` |

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Electron Desktop│───▶│  Express Proxy  │───▶│ Grafana Instance│  
│                 │    │                 │    │                 │
│ • VS Code UI    │    │ • CORS Handling │    │ • Data Sources  │
│ • AI Analytics  │    │ • SSL Support   │    │ • Query API     │
│ • File System   │    │ • Authentication│    │ • Dashboards    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │
          ▼
┌─────────────────┐
│   AI Providers  │
│                 │
│ • Ollama (Local)│
│ • OpenAI (Cloud)│
│ • Vision Support│
└─────────────────┘
```

## 🤝 Contributing

We welcome contributions! Areas for enhancement:
- Additional AI providers and models
- Query optimization and performance monitoring  
- New visualization types and analysis modes
- Additional data source support

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 (AGPLv3).
See the [LICENSE](LICENSE) file for the full license text.

---

<div align="center">

**Built with ❤️ for the time series community**

[⭐ Star us on GitHub](https://github.com/Liquescent-Development/grafana-query-ide) • [🐛 Report Issues](https://github.com/Liquescent-Development/grafana-query-ide/issues) • [💬 Discussions](https://github.com/Liquescent-Development/grafana-query-ide/discussions)

</div>