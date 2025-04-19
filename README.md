# Trump News Tracker

A web application for tracking news, media, sentiment analysis, timeline, and finance related to Donald Trump.

## Features

* Real-time news aggregation from multiple sources
* Sentiment analysis of news articles
* Media tracking (YouTube videos and social media posts)
* Interactive timeline of key events
* Finance tracker showing correlation between Trump events and financial markets
* Entity mention leaderboard and analysis

## Automatic Server Startup

The application now includes an automatic server startup feature. When you open `index.html` in your browser, it will:

1. Automatically attempt to start the server via the `/start-server` API endpoint
2. Check if the server is running at regular intervals
3. Redirect you to the application once the server is ready

This makes it easier to use the Trump News Tracker - simply open the HTML file and everything will start automatically!

### Notes:
- For Windows users, the `start-app.bat` file will be executed
- For Mac/Linux users, the `start-app.sh` file will be executed
- If the server is already running, the application will simply connect to it

## How to Run the Application

### Prerequisites

- Node.js (v14 or higher)
- NPM (Node Package Manager)

### Installation

1. Clone this repository or download the source code
2. Open a terminal/command prompt in the project directory
3. Install dependencies:

```bash
npm install
```

### Running the Application

**IMPORTANT: The application must be accessed through the server to work properly.**

1. Start the server:

```bash
node server.js
```

2. Open your web browser and navigate to:

```
http://localhost:3000
```

### Common Issues

#### "API calls fail when opening index.html directly"

Do not open the HTML files directly from your file system. The application must be accessed through the server (http://localhost:3000) for API calls to work properly. This is because:

- The browser's same-origin policy prevents API calls from `file://` origins
- The server provides necessary API endpoints for data
- All paths are relative to the server root

#### "Cannot connect to server" or "Connection refused"

Ensure that:
- The server is running (you should see "Press Ctrl+C to stop the server" in your terminal)
- You're using the correct port (default is 3000)
- No firewall is blocking the connection

## API Documentation

The application provides the following API endpoints:

- `/api/news` - Get news articles with sentiment analysis
- `/api/youtube/videos` - Get YouTube videos related to Trump
- `/api/social-posts` - Get social media posts
- `/api/timeline` - Get timeline events
- `/api/finance` - Get financial data and correlated Trump events
- `/api/mentions` - Get entity mention data

## Technical Details

The application uses:
- Express.js for the server
- Vanilla JavaScript for the client
- Chart.js for data visualization
- Bootstrap for styling

## Notes on Web Scraping

This application is for educational purposes only. Web scraping may be against the terms of service of some websites. Always review a website's terms of service and robots.txt file before scraping. Consider implementing:

- Rate limiting
- Caching
- User agent rotation
- Respecting robots.txt

## License

This project is for educational purposes only. Use at your own risk. 