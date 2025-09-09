# OBP - Online Brand Protection

🛡️ **Advanced trademark intelligence and brand protection platform** powered by EUIPO data. OBP provides comprehensive brand monitoring, trademark analysis, and intellectual property protection services for businesses and legal professionals.

## Features

- 🛡️ **Brand Protection Analysis** - Advanced trademark similarity detection
- 🔍 **Multi-Pattern Search** - Exact match, phonetic, spelling variations, and fuzzy matching
- 📊 **Trademark Intelligence** - Detailed trademark information, status tracking, and classifications
- 🎯 **Similarity Scoring** - Levenshtein distance-based brand similarity analysis
- 📄 **Smart Pagination** - Efficient browsing of large result sets
- 🎨 **Modern Interface** - Vibrant, professional UI with real-time interactions
- 🔐 **Secure API Integration** - OAuth2 authentication with EUIPO
- ⚡ **Real-time Analysis** - Instant brand protection insights with comprehensive error handling
- 🖼️ **Visual Trademark Support** - Image display for figurative marks
- 📱 **Responsive Design** - Optimized for desktop and mobile devices

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- EUIPO API credentials (KEY and SECRET)

## Installation

1. Clone or download this repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your EUIPO API credentials:
   ```env
   KEY=your_client_id_here
   SECRET=your_client_secret_here
   PORT=3000
   ```

## Getting EUIPO API Credentials

1. Visit the [EUIPO Developer Portal](https://dev-sandbox.euipo.europa.eu)
2. Register for an account
3. Create a new application for the Trademark Search API
4. Note down your Client ID (KEY) and Client Secret (SECRET)

## Usage

### Production

1. Start the application:

   ```bash
   npm start
   ```

### Development

1. Start the development server with automatic restarts:

   ```bash
   npm run dev
   ```

   The development server uses nodemon and will automatically restart when you make changes to:

   - `server.js`
   - Files in the `public/` directory (HTML, CSS, JS)
   - JSON configuration files

2. Open your browser and navigate to `http://localhost:3000`

3. Enter a trademark name in the search box and click "Search"

4. Browse the results and click on any trademark card to view detailed information

## API Endpoints

The application exposes the following REST API endpoints:

### Search Trademarks

```
GET /api/search?name={trademark_name}&page={page}&size={size}
```

**Parameters:**

- `name` (required): The trademark name to search for
- `page` (optional): Page number (0-based, default: 0)
- `size` (optional): Number of results per page (default: 10, max: 100)

**Response:**

```json
{
  "trademarks": [...],
  "totalElements": 150,
  "totalPages": 15,
  "page": 0,
  "size": 10
}
```

### Get Trademark Details

```
GET /api/trademark/{applicationNumber}
```

**Parameters:**

- `applicationNumber` (required): The 9-digit application number

**Response:** Full trademark details including goods/services, descriptions, etc.

### Health Check

```
GET /health
```

Returns application status and timestamp.

## Project Structure

```
trademark-search-2/
├── server.js              # Express server and API routes
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (create this)
├── README.md              # This file
└── public/                # Static frontend files
    ├── index.html         # Main HTML page
    ├── styles.css         # CSS styles
    └── script.js          # Frontend JavaScript
```

## Technical Details

### Authentication

The application uses OAuth2 Client Credentials flow to authenticate with the EUIPO API:

1. Exchanges client credentials for an access token
2. Caches the token and refreshes it automatically when expired
3. Includes the token in all API requests

### Search Implementation

- Uses RSQL query syntax to search for trademarks
- Searches the `wordMarkSpecification.verbalElement` field with wildcard matching
- Supports pagination and sorting
- Results are sorted by application date (newest first)

### Error Handling

- Comprehensive error handling for API failures
- User-friendly error messages
- Rate limiting awareness (HTTP 429 handling)
- Authentication error detection and reporting

## API Rate Limits

The EUIPO API has rate limits. The application handles rate limit responses (HTTP 429) gracefully and displays appropriate error messages.

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Development

To run in development mode with auto-restart on file changes, you can use:

```bash
npm install -g nodemon
nodemon server.js
```

## Troubleshooting

### Common Issues

1. **"Authentication failed" error**

   - Check that your KEY and SECRET are correct in the `.env` file
   - Ensure your EUIPO API credentials are active

2. **"Rate limit exceeded" error**

   - Wait a few minutes before making more requests
   - The EUIPO API has usage limits

3. **No results found**

   - Try different search terms
   - Check spelling and try partial matches
   - Some trademarks may not have verbal elements

4. **Server won't start**
   - Check that port 3000 is not already in use
   - Verify all dependencies are installed with `npm install`

### Environment Variables

Make sure your `.env` file is properly formatted:

```env
KEY=abcd
SECRET=asbdjsk
PORT=3000
```

## License

This project is for demonstration purposes. Please respect EUIPO's terms of service when using their API.

## Disclaimer

This application uses the EUIPO sandbox environment for testing. For production use, you would need to:

1. Use the production API endpoints
2. Implement proper token storage (database/Redis)
3. Add user authentication and authorization
4. Implement proper logging and monitoring
5. Add comprehensive input validation and sanitization
