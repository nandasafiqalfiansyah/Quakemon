# Quakemon
**Quakemon** is a real-time earthquake monitoring application that utilizes official data from BMKG (Indonesia's Meteorology, Climatology, and Geophysical Agency). It integrates multiple BMKG data sources including recent earthquakes, felt earthquakes, and shakemap images to provide fast and accurate earthquake insights across Indonesia.

## 🔍 Key Features
- Displays **recent earthquakes** in real-time
- Shows **felt earthquakes** reported by the public
- Integrates **shakemap images** from BMKG for visual impact zones
- Provides details like location, magnitude, depth, affected areas, and tsunami potential
- Supports both **JSON** and **XML** formats from BMKG APIs

## 🔗 Data Sources
- [Recent Earthquakes (JSON)](https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json)
- [Felt Earthquakes (JSON)](https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json)
- [Shakemap Images (JPG)](https://data.bmkg.go.id/DataMKG/TEWS/)

## 📦 Tech Stack
- JavaScript / TypeScript
- Node.js / Next.js / React *(depending on implementation)*
- Fetch API / Axios
- XML & JSON parsing

## 🛠️ Getting Started
```bash
git clone https://github.com/your-username/quakemon.git
cd quakemon
npm install
npm run dev
````

## 📈 Example Response Data
Sample BMKG data structure (XML/JSON) is available at [docs/data-example.md](docs/data-example.md)

## 📷 Shakemap Preview
![Shakemap Sample](https://data.bmkg.go.id/DataMKG/TEWS/20250719182555.mmi.jpg)

## 🧠 Contribution
Pull requests are welcome! Feel free to fork this repo and add features like map integration, push notifications, or data visualization.

## ⚠️ Disclaimer
All data is fetched directly from BMKG. This project is a data visualization tool and is not responsible for the accuracy, delay, or content of the information provided.

© 2025 Quakemon Project — Built with ❤️ for Indonesia.