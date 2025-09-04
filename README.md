# Qobuz-DL

A web-based music downloader for Qobuz with a modern UI and database storage for metadata management.

## Architecture

- **Frontend**: Next.js application with React components
- **Backend Services** (`be/`): Core business logic and database operations
- **API Routes** (`app/api/`): REST endpoints for frontend-backend communication
- **Database**: SQLite with Drizzle ORM for metadata storage

## Getting Started

Before you can use Qobuz-DL, you need to change the .env file in the root directory. The default configuration will NOT work. QOBUZ_APP_ID and QOBUZ_SECRET must be set to the correct values. To find these you can use [this tool](https://github.com/QobuzDL/Qobuz-AppID-Secret-Tool). Additionally, in order to download files longer than 30 seconds, a valid Qobuz token is needed. This can be found in the localuser.token key of localstorage on the official [Qobuz website](https://play.qobuz.com/) for any paying members.
### Prerequisites

- Node.js 18+ 
- npm or yarn
- Qobuz account credentials

### Installation

```bash
npm install
# or
yarn install
```

### Environment Setup

Create a `.env.local` file with your database configuration:

```env
DB_URL=file:./local.sqlite
DB_AUTH_TOKEN=your_token_if_using_remote_db
```

### Running the Application

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`.

## API Usage

### 1. Download Metadata

Before downloading songs, you need to fetch and store metadata in the database.

**Endpoint**: `POST /api/store-music-metadata`

**Query Parameters**:
- `q` (required): Search query string

**Example**:
```bash
curl -X POST "http://localhost:3000/api/store-music-metadata?q=pink%20floyd"
```

**What it does**:
- Searches Qobuz for the given query
- Stores artists, albums, genres, labels, and tracks in the database
- Returns statistics about stored items
- Fetches up to 500 items per batch and continues until all results are processed

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Search results stored successfully",
    "stats": {
      "artists": 5,
      "genres": 3,
      "labels": 8,
      "albums": 25,
      "tracks": 250
    }
  }
}
```

### 2. Start Song Downloads

Once metadata is stored, you can start downloading the actual audio files.

#### Option A: Download Individual Tracks

**Endpoint**: `POST /api/download-tracks`

**Example**:
```bash
curl -X POST "http://localhost:3000/api/download-tracks"
```

**What it does**:
- Processes all tracks with `downloadStatus: "PENDING"` 
- Downloads each track individually to organized folders
- Updates track status to `SUCCESS` or `FAILED`

#### Option B: Download Complete Albums (Recommended)

**Endpoint**: `POST /api/download-albums`

**Body Parameters**:
- `albumCountToDownload` (required): Number of albums to process

**Example**:
```bash
curl -X POST "http://localhost:3000/api/download-albums" \
  -H "Content-Type: application/json" \
  -d '{"albumCountToDownload": 5}'
```

**What it does**:
- Processes albums with `downloadStatus: "PENDING"`
- Downloads all tracks in each album with proper track numbering
- Downloads album artwork
- Creates organized folder structure: `Artist/Album --- Genre --- Year/`
- Runs in background and returns immediately

## Download Folder Structure

Downloaded files are organized as follows:

```
downloads/
├── Artist Name/
│   └── Album Title --- Genre --- Release Year/
│       ├── cover.jpg
│       ├── 1 - Track Title.flac
│       ├── 2 - Track Title.flac
│       └── ...
```

## Backend Services

The backend is organized into several services in the `be/` directory:

### Database Layer (`be/infra/database/`)
- **Models**: Define database schema for artists, albums, tracks, genres, labels
- **Repositories**: Data access layer with CRUD operations
- **Connection**: Database connection and configuration

### Business Logic (`be/services/`)
- **`musicMetadata.service.ts`**: Handles searching and storing metadata
- **`albumDownload.service.ts`**: Manages complete album downloads
- **`musicDownload.service.ts`**: Handles individual track downloads  
- **`musicUrl.service.ts`**: Generates download URLs from Qobuz

## API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/get-music` | GET | Search Qobuz catalog |
| `/api/get-album` | GET | Get album details |
| `/api/get-artist` | GET | Get artist information |
| `/api/get-releases` | GET | Get artist releases |
| `/api/store-music-metadata` | POST | Store search results in database |
| `/api/download-music` | GET | Get direct download URL for a track |
| `/api/download-tracks` | POST | Process pending track downloads |
| `/api/download-albums` | POST | Process pending album downloads |

## Workflow

1. **Search & Store**: Use `/api/store-music-metadata` to find and store music metadata
2. **Download**: Use `/api/download-albums` to download complete albums with artwork
3. **Monitor**: Check the `downloads/` folder for organized music files

## Status Tracking

The system tracks download status for both albums and tracks:
- `PENDING`: Ready for download
- `PROCESSING`: Currently downloading  
- `SUCCESS`: Downloaded successfully
- `FAILED`: Download failed

## Quality Settings

Downloads default to highest quality (FLAC 24-bit when available). Quality options:
- `27`: Hi-Res (24-bit/up to 192kHz)
- `7`: CD Quality (16-bit/44.1kHz)
- `6`: MP3 320kbps
- `5`: MP3 320kbps (alternative)
