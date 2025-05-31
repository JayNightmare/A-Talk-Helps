# Talking Helps

An anonymous space for sharing thoughts and feelings, built with Node.js, Express, and MongoDB.

## Features

- **Anonymous Posting**: No accounts required - just start sharing
- **Safe Space**: Content filtering and moderation
- **Community Support**: Comments and likes
- **Privacy First**: No personal data collection
- **Mobile Friendly**: Responsive design

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, and JavaScript
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Session Management**: Express Session
- **Content Security**: DOMPurify for XSS prevention

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/talking-helps.git
   cd talking-helps
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/talkingHelps
   SESSION_SECRET=your-secret-key-here
   NODE_ENV=development
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

## Project Structure

```
talking-helps/
├── public/              # Static files
│   ├── styles/         # CSS files
│   ├── scripts/        # Client-side JavaScript
│   ├── index.html      # Home page
│   ├── profile.html    # Profile page
│   └── support.html    # Support page
├── server.js           # Main application file
├── package.json        # Project dependencies
└── README.md          # Project documentation
```

## API Endpoints

### Authentication
- `GET /api/alias` - Get or generate an anonymous alias

### Posts
- `GET /api/posts` - Get paginated posts
- `POST /api/posts` - Create a new post
- `PUT /api/posts/:id` - Update a post
- `DELETE /api/posts/:id` - Delete a post
- `POST /api/posts/:id/like` - Toggle like on a post

### Comments
- `GET /api/posts/:id/comments` - Get comments for a post
- `POST /api/comments` - Create a new comment
- `DELETE /api/comments/:id` - Delete a comment

### Profile
- `GET /api/profile/posts` - Get user's posts
- `GET /api/profile/comments` - Get user's comments
- `GET /api/profile/likes` - Get user's liked posts

## Security Features

- XSS Prevention using DOMPurify
- CSRF Protection
- Rate Limiting
- Content Filtering
- Secure Session Management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- All the mental health resources linked in the Support page 