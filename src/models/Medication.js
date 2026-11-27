const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  manufacturer: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
    enum: [
      'Antibiotics',
      'Pain Relief',
      'Cardiovascular',
      'Diabetes',
      'Mental Health',
      'Respiratory',
      'Digestive',
      'Vitamins & Supplements',
      'Other'
    ]
  },
  status: {
    type: String,
    enum: ['available', 'unavailable'],
    default: 'available'
  },
  description: {
    type: String,
    trim: true
  },
  activeIngredient: {
    type: String,
    trim: true
  },
  dosageForm: {
    type: String,
    trim: true
  },
  strength: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for search functionality
medicationSchema.index({ name: 'text', manufacturer: 'text', category: 'text' });

module.exports = mongoose.model('Medication', medicationSchema);