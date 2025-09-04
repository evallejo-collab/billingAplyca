// Vercel API Route for Categories
import { readFileSync } from 'fs';
import { join } from 'path';

const getDataPath = () => join(process.cwd(), 'data', 'categories.json');

const readCategories = () => {
  try {
    const data = readFileSync(getDataPath(), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method, query } = req;

  try {
    switch (method) {
      case 'GET':
        return handleGetCategories(req, res);

      default:
        return res.status(405).json({
          success: false,
          message: 'Método no soportado'
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

function handleGetCategories(req, res) {
  const categories = readCategories();
  const { include_inactive } = req.query;
  
  let filteredCategories = categories;
  if (!include_inactive) {
    filteredCategories = categories.filter(category => category.is_active);
  }

  return res.status(200).json({
    success: true,
    categories: filteredCategories
  });
}