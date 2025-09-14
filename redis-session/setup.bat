@echo off
echo 🚀 Setting up MCP Redis Server...

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

echo ✅ Node.js version:
node --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Install MCP SDK peer dependency
echo 📦 Installing MCP SDK peer dependency...
npm install @modelcontextprotocol/sdk@^0.5.0

if errorlevel 1 (
    echo ❌ Failed to install dependencies
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy env.example .env
    echo ✅ .env file created. Please edit it with your Redis configuration.
) else (
    echo ✅ .env file already exists
)

REM Build the project
echo 🔨 Building the project...
npm run build

if errorlevel 1 (
    echo ❌ Build failed
    exit /b 1
)

echo ✅ Project built successfully

echo.
echo 🎉 Setup complete! You can now:
echo    • Start Redis: redis-server
echo    • Run the server: npm start
echo    • Or use Docker: docker-compose up -d
echo.
echo 📚 Check README.md for detailed usage instructions.
