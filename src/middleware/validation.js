const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        error: 'Validation Error',
        message: errorMessage
      });
    }
    
    next();
  };
};

// Validation schemas
const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  medication: Joi.object({
    name: Joi.string().required().trim(),
    manufacturer: Joi.string().required().trim(),
    category: Joi.string().required().valid(
      'Antibiotics', 'Pain Relief', 'Cardiovascular', 'Diabetes',
      'Mental Health', 'Respiratory', 'Digestive', 'Vitamins & Supplements', 'Other'
    ),
    status: Joi.string().valid('available', 'unavailable').default('available'),
    description: Joi.string().trim(),
    activeIngredient: Joi.string().trim(),
    dosageForm: Joi.string().trim(),
    strength: Joi.string().trim()
  }),

  alternative: Joi.object({
    originalMedication: Joi.string().required(),
    name: Joi.string().required().trim(),
    manufacturer: Joi.string().required().trim(),
    availablePharmacies: Joi.array().items(Joi.string()),
    priceRange: Joi.object({
      min: Joi.number().min(0).required(),
      max: Joi.number().min(0).required(),
      currency: Joi.string().default('USD')
    }).required(),
    activeIngredient: Joi.string().trim(),
    dosageForm: Joi.string().trim(),
    strength: Joi.string().trim(),
    notes: Joi.string().trim()
  }),

  pharmacy: Joi.object({
    name: Joi.string().required().trim(),
    location: Joi.object({
      address: Joi.string().required().trim(),
      city: Joi.string().required().trim(),
      state: Joi.string().required().trim(),
      zipCode: Joi.string().required().trim(),
      coordinates: Joi.object({
        latitude: Joi.number(),
        longitude: Joi.number()
      })
    }).required(),
    contactInfo: Joi.object({
      phone: Joi.string().required().trim(),
      email: Joi.string().email().trim(),
      website: Joi.string().uri().trim()
    }).required(),
    operatingHours: Joi.object({
      monday: Joi.object({ open: Joi.string(), close: Joi.string() }),
      tuesday: Joi.object({ open: Joi.string(), close: Joi.string() }),
      wednesday: Joi.object({ open: Joi.string(), close: Joi.string() }),
      thursday: Joi.object({ open: Joi.string(), close: Joi.string() }),
      friday: Joi.object({ open: Joi.string(), close: Joi.string() }),
      saturday: Joi.object({ open: Joi.string(), close: Joi.string() }),
      sunday: Joi.object({ open: Joi.string(), close: Joi.string() })
    }),
    services: Joi.array().items(
      Joi.string().valid('Prescription Filling', 'Consultation', 'Home Delivery', 'Insurance Accepted', 'Generic Substitution')
    ),
    isActive: Joi.boolean().default(true)
  })
};

module.exports = {
  validateRequest,
  schemas
};