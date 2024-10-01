# 📊 Survey Web Application

The **Survey Web Application** is a dynamic tool built using **Node.js** and **PostgreSQL** that allows users to create, manage, and answer surveys with multiple sections, questions, and answer types. The app stores survey structures in a PostgreSQL database and records user responses for further analysis.

## Features

- **Create Surveys**: Users can design surveys with multiple sections, each containing various types of questions.
- **Database-Driven**: Surveys and their responses are stored in a PostgreSQL database.
- **Dynamic UI**: Create and answer surveys through a modern, responsive web interface.
- **Data Collection**: User responses are captured and saved for later analysis or export.

## Installation

To set up the Survey Web Application, follow these steps:

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/survey-app.git
cd survey-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up PostgreSQL database

- Create a new PostgreSQL database.
- Update the `db.js` file with your PostgreSQL credentials.

### 4. Configure environment variables

Create a `.env` file in the project’s root directory:

```env
DATABASE_URL=your_postgresql_connection_url
PORT=3000
```

### 5. Run the application

```bash
npm start
```

### 6. Access the application

Open your browser and visit [http://localhost:3000](http://localhost:3000).

## Technologies Used

- **Node.js**: JavaScript runtime for the backend.
- **Express.js**: Web framework for Node.js.
- **PostgreSQL**: Relational database for storing survey data and responses.
- **HTML/CSS/JavaScript**: Frontend for dynamic survey creation and interaction.

## Contributing

Contributions are welcome! Feel free to fork the repository and make pull requests for any improvements or features you would like to add.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Special thanks to:
- The Node.js and PostgreSQL communities for their outstanding tools and libraries.
- Open-source contributors for their valuable resources that made this project possible.

## Contact

For any inquiries or support, please contact [your-email@example.com](mailto:your-email@example.com).
