# 🎓 Doctorate Program Evaluation Tool

An interactive web application for exploring, filtering, and evaluating PhD programs at Spanish and Portuguese universities.

## 🌐 Live Demo

**Visit the app:** [https://hesusg.github.io/doctorate-grading/](https://hesusg.github.io/doctorate-grading/)

## ✨ Features

- **🗺️ Interactive Map**: Explore universities on an interactive map with clustering
- **🔍 Advanced Filtering**: Filter by city, rating, status, and university name
- **📊 Program Details**: View comprehensive program information in beautiful modals
- **⭐ Rating System**: Track program status and ratings
- **💾 Data Export**: Save and download your evaluation data as SQLite database files
- **🎯 AI-Powered Insights**: View AI-generated program and city analysis with calculated averages
- **🏙️ City Criteria**: Evaluate cities based on cost, medical services, transport, air quality, and weather

## 🚀 Technology Stack

- **Frontend**: Vanilla JavaScript with ES Modules
- **Database**: SQLite with sql.js (client-side)
- **Mapping**: Leaflet.js with clustering
- **UI**: CSS3 with glassomorphism effects
- **Icons**: Font Awesome
- **Hosting**: GitHub Pages (static hosting)

## 💾 Database Features

- **Client-side SQLite**: No server required - runs entirely in your browser
- **Data Export**: Download your evaluation data as .db files
- **Data Import**: Upload and restore from .db files
- **Real-time Calculations**: Live averages for program and city metrics

## 🎨 Design

- Beautiful purple-pink gradient theme
- Glassomorphism UI elements
- Responsive design for all devices
- Performance-based color coding
- Smooth animations and transitions

## 🔧 Development

This app is built with modern web standards:

- ES Modules for clean, modular code
- No build tools required - runs directly in the browser
- Service-oriented architecture with separate database services
- Comprehensive error handling and validation

## 📱 Usage

1. **Browse Programs**: Use the interactive map to explore universities
2. **Filter Results**: Apply filters to find programs matching your criteria
3. **View Details**: Click on university markers to see detailed program information
4. **Rate Programs**: Evaluate programs and track your application status
5. **Export Data**: Save your evaluation data for future reference

## 🏗️ Architecture

```
├── index.html              # Main application entry point
├── styles.css              # Global styles and theming
├── js/
│   ├── main.js            # Application initialization
│   ├── components/        # UI components (map, modals)
│   ├── database/          # SQLite service layer
│   └── utils/             # Helper utilities
├── db/
│   └── doctorate.sqlite   # Main database file
└── components/            # HTML templates
```

## 🌟 Key Features in Detail

### Interactive Map
- Leaflet.js integration with custom markers
- University clustering for better performance
- Responsive marker popups with program summaries

### Database Integration
- Client-side SQLite using sql.js
- Normalized database schema (countries → cities → universities → programs)
- CRUD operations for all entities
- Export/import functionality

### AI Analytics
- Program quality metrics and summaries
- City livability analysis
- Automated average calculations
- Performance-based color coding

### Modern UI
- Glassomorphism design language
- Performance-based gradient systems
- Font Awesome icons throughout
- Responsive design principles

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Developed with ❤️ for PhD program evaluation**