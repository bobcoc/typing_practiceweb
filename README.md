# Type Practice

Type Practice is a web application designed to help users improve their typing skills through various practice exercises. It includes features for user registration, login, and an admin panel for managing code examples.

## Features

- User Registration and Login
- Typing Practice Exercises
- Admin Panel for Managing Code Examples
- **K-Means Algorithm Visualization** (NEW!)
- Responsive Design

## Technologies Used

- React
- TypeScript
- Node.js
- Express
- MongoDB
- Material-UI

## Getting Started

### Prerequisites

Ensure you have the following installed:

- Node.js
- npm (Node Package Manager)
- MongoDB

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/bobcoc/typing_practiceweb.git
   cd typing_practiceweb
   ```

2. Install server dependencies:

   ```bash
   cd server
   npm install
   ```

3. Install client dependencies:

   ```bash
   cd ../client
   npm install
   ```

### Running the Application

1. Start the MongoDB server.

2. Run the server and client concurrently:

   ```bash
   cd ..
   npm run start
   ```

   This will start both the server and client.

### Environment Variables

Create a `.env` file in the root directory and add the following variables:

```plaintext
# Server Configuration
PORT=3001
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/typeskill
MONGODB_DB_NAME=typeskill

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Client Configuration
CLIENT_URL=http://localhost:3001
```

You can copy the contents from `.env.example` and modify them according to your needs.

## Usage

- Visit `http://localhost:3001` to access the application.
- Register a new account or log in with existing credentials.
- Admin users can access the admin panel to manage code examples.
- **NEW: Access K-Means visualization demo at `http://localhost:3001/kmeans`**
  - See [KMEANS_QUICKSTART.md](./KMEANS_QUICKSTART.md) for quick start guide
  - See [KMEANS_README.md](./KMEANS_README.md) for detailed documentation
  - See [KMEANS_DEPLOYMENT.md](./KMEANS_DEPLOYMENT.md) for deployment guide

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any improvements.

## License

This project is licensed under the MIT License.

## Contact

For any inquiries, please contact [smshine@qq.com](mailto:smshine@qq.com).

