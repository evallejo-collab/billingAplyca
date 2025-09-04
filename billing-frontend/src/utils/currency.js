// Utility functions for currency formatting

export const formatCOP = (amount) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const formatCOPWithDecimals = (amount) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

export const formatNumber = (number) => {
  return new Intl.NumberFormat('es-CO').format(number || 0);
};

export const parseCOP = (copString) => {
  if (!copString) return 0;
  
  // Remove currency symbol and formatting
  const cleanString = copString.toString()
    .replace(/[^\d,-]/g, '') // Remove everything except digits, comma, and dash
    .replace(',', '.'); // Convert comma to dot for decimal
  
  return parseFloat(cleanString) || 0;
};