# My Locater Pins

A mobile-first location tracking app built with React, Vite, and Tailwind CSS.

## Development

1. Install dependencies:
   ```bash
   npm install
   ```
   *Note: Ensure you have `vite`, `@vitejs/plugin-react`, `react`, `react-dom`, and `@google/genai` installed.*

2. Create a `.env` file in the root directory:
   ```
   VITE_API_KEY=your_gemini_api_key_here
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

## Deployment on Vercel

1. **Push to GitHub**: Push your code to a GitHub repository.

2. **Import Project**: 
   - Go to [Vercel](https://vercel.com).
   - Click "Add New..." -> "Project".
   - Import your GitHub repository.

3. **Configure Build**:
   - Vercel usually detects Vite automatically.
   - **Framework Preset**: Vite
   - **Build Command**: `vite build`
   - **Output Directory**: `dist`

4. **Environment Variables**:
   - In the "Environment Variables" section of the Vercel project settings, add:
     - Key: `VITE_API_KEY`
     - Value: `your_actual_gemini_api_key`

5. **Deploy**: Click Deploy.
