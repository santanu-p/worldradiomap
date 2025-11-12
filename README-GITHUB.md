# 🌍 World Radio Map

> Discover and listen to 10,000+ live radio stations from around the world on an interactive map

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://your-demo-url.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

![World Radio Map Screenshot](screenshot.png)

## ✨ Features

- 🗺️ **Interactive World Map** - Explore radio stations using Leaflet.js mapping
- 📻 **10,000+ Radio Stations** - Live streams from over 200 countries
- 🎵 **Beautiful Visualizer** - Relaxing floating animations while listening
- 🔍 **Smart Search** - Find stations by country, city, genre, or name
- 📱 **Fully Responsive** - Works seamlessly on mobile, tablet, and desktop
- ⚡ **Lightning Fast** - IndexedDB caching for instant loading
- 🌐 **PWA Support** - Install as an app on your device
- 🎨 **Modern UI** - Beautiful gradient design with glass-morphism effects
- 🔊 **High Quality** - Stream audio directly in your browser
- 🆓 **Completely Free** - No registration or subscription required

## 🚀 Live Demo

**[Try it now →](https://your-demo-url.com)**

## 📸 Screenshots

### Desktop View
![Desktop](docs/desktop.png)

### Mobile View
![Mobile](docs/mobile.png)

### Music Visualizer
![Visualizer](docs/visualizer.gif)

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Mapping**: Leaflet.js with marker clustering
- **API**: Radio Browser API
- **Caching**: IndexedDB for offline support
- **PWA**: Service Worker for app-like experience
- **SEO**: Comprehensive meta tags and structured data

## 📦 Installation

### Option 1: Clone and Run Locally

```bash
# Clone the repository
git clone https://github.com/yourusername/world-radio-map.git

# Navigate to the project directory
cd world-radio-map

# Open in browser
# Simply open index.html in your web browser
# Or use a local server:
python -m http.server 8000
# Then visit http://localhost:8000
```

### Option 2: Deploy to GitHub Pages

1. Fork this repository
2. Go to Settings → Pages
3. Select main branch as source
4. Your site will be live at `https://yourusername.github.io/world-radio-map`

### Option 3: Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/world-radio-map)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## 🎯 Usage

1. **Explore the Map** - Click on blue markers to discover radio stations
2. **Search** - Type a country, city, or genre in the search box
3. **Browse** - Click "Browse" to see a list of all stations
4. **Play** - Click any station to start listening
5. **Enjoy** - Watch the beautiful floating animations!

## 🔧 Configuration

### Using Local Station Data (Faster Loading)

For instant loading, download station data once:

1. Open `download-stations.html` in your browser
2. Click "Download Stations Data"
3. Save `stations.json` to the project root
4. Update `app.js` line ~67 to load from local file

### API Configuration

The project uses the Radio Browser API. To use a different API:

1. Open `app.js`
2. Modify the API URLs in `fetchStationsFromAPI()` function
3. Adjust the data parsing logic as needed

## 📱 Mobile Support

The site is fully responsive and optimized for:
- ✅ iOS devices (iPhone, iPad)
- ✅ Android phones and tablets
- ✅ Touch gestures (pinch, zoom, swipe)
- ✅ Landscape and portrait orientations
- ✅ PWA installation on home screen

## 🎨 Customization

### Change Color Scheme

Edit the CSS variables in `index.html`:

```css
/* Primary color */
#00d4ff → Your color

/* Secondary color */
#0095ff → Your color
```

### Modify Visualizer

Edit the particle count and animation in `app.js`:

```javascript
// Change particle count (line ~15)
for (let i = 0; i < 20; i++) { // Change 20 to desired number
```

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct.

## 🐛 Bug Reports

Found a bug? Please [open an issue](https://github.com/yourusername/world-radio-map/issues) with:
- Description of the bug
- Steps to reproduce
- Expected behavior
- Screenshots (if applicable)
- Browser and OS information

## 📝 To-Do

- [ ] Add favorite stations feature
- [ ] Implement user playlists
- [ ] Add genre-based filtering
- [ ] Create station rating system
- [ ] Add audio equalizer
- [ ] Implement sleep timer
- [ ] Add lyrics display
- [ ] Create station history
- [ ] Multi-language support
- [ ] Dark/Light theme toggle

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Radio Browser API** - For providing free access to radio station data
- **Leaflet.js** - For the amazing mapping library
- **Leaflet.markercluster** - For marker clustering functionality
- **CartoDB** - For the beautiful dark map tiles
- All the radio stations and broadcasters around the world

## 📊 Project Stats

- **Radio Stations**: 10,000+
- **Countries**: 200+
- **Languages**: 100+
- **Genres**: Music, News, Sports, Talk, and more

## 🌟 Star History

If you find this project useful, please consider giving it a ⭐!

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/world-radio-map&type=Date)](https://star-history.com/#yourusername/world-radio-map&Date)

## 📞 Contact

- **GitHub**: [@yourusername](https://github.com/yourusername)
- **Email**: your.email@example.com
- **Twitter**: [@yourhandle](https://twitter.com/yourhandle)

## 🔗 Related Projects

- [Radio Browser](https://www.radio-browser.info/) - Community radio station database
- [Online Radio Box](https://onlineradiobox.com/) - Another radio aggregator
- [TuneIn](https://tunein.com/) - Commercial radio service

---

<p align="center">Made with ❤️ by <a href="https://github.com/yourusername">Your Name</a></p>

<p align="center">
  <a href="https://github.com/yourusername/world-radio-map/stargazers">⭐ Star</a>
  ·
  <a href="https://github.com/yourusername/world-radio-map/issues">🐛 Report Bug</a>
  ·
  <a href="https://github.com/yourusername/world-radio-map/issues">💡 Request Feature</a>
</p>
