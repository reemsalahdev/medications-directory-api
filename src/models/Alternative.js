const mongoose = require('mongoose');

const alternativeSchema = new mongoose.Schema({
  originalMedication: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medication',
    required: true
  },
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
  availablePharmacies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacy'
  }],
  priceRange: {
    min: {
      type: Number,
      required: true,
      min: 0
    },
    max: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
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
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Validate price range
alternativeSchema.pre('save', function(next) {
  if (this.priceRange.min > this.priceRange.max) {
    next(new Error('Minimum price cannot be greater than maximum price'));
  }
  next();
});

module.exports = mongoose.model('Alternative', alternativeSchema);