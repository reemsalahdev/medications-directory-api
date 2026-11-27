const express = require('express');
const Medication = require('../models/Medication');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Medication:
 *       type: object
 *       required:
 *         - name
 *         - manufacturer
 *         - category
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         manufacturer:
 *           type: string
 *         category:
 *           type: string
 *           enum: [Antibiotics, Pain Relief, Cardiovascular, Diabetes, Mental Health, Respiratory, Digestive, Vitamins & Supplements, Other]
 *         status:
 *           type: string
 *           enum: [available, unavailable]
 *         description:
 *           type: string
 *         activeIngredient:
 *           type: string
 *         dosageForm:
 *           type: string
 *         strength:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/medications:
 *   get:
 *     summary: Get all medications
 *     tags: [Medications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, unavailable]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of medications
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    const medications = await Medication.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Medication.countDocuments(filter);

    res.json({
      medications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    logger.error('Error fetching medications:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch medications'
    });
  }
});

/**
 * @swagger
 * /api/medications/{id}:
 *   get:
 *     summary: Get medication by ID
 *     tags: [Medications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Medication details
 *       404:
 *         description: Medication not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const medication = await Medication.findById(req.params.id);
    
    if (!medication) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Medication not found'
      });
    }

    res.json(medication);
  } catch (error) {
    logger.error('Error fetching medication:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch medication'
    });
  }
});

/**
 * @swagger
 * /api/medications:
 *   post:
 *     summary: Create new medication
 *     tags: [Medications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Medication'
 *     responses:
 *       201:
 *         description: Medication created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, requireAdmin, validateRequest(schemas.medication), async (req, res) => {
  try {
    const medication = new Medication(req.body);
    await medication.save();

    logger.info(`Medication created: ${medication.name} by ${req.user.email}`);

    res.status(201).json({
      message: 'Medication created successfully',
      medication
    });
  } catch (error) {
    logger.error('Error creating medication:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create medication'
    });
  }
});

/**
 * @swagger
 * /api/medications/{id}:
 *   put:
 *     summary: Update medication
 *     tags: [Medications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Medication'
 *     responses:
 *       200:
 *         description: Medication updated successfully
 *       404:
 *         description: Medication not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', authenticateToken, requireAdmin, validateRequest(schemas.medication), async (req, res) => {
  try {
    const medication = await Medication.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!medication) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Medication not found'
      });
    }

    logger.info(`Medication updated: ${medication.name} by ${req.user.email}`);

    res.json({
      message: 'Medication updated successfully',
      medication
    });
  } catch (error) {
    logger.error('Error updating medication:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update medication'
    });
  }
});

/**
 * @swagger
 * /api/medications/{id}:
 *   delete:
 *     summary: Delete medication
 *     tags: [Medications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Medication deleted successfully
 *       404:
 *         description: Medication not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const medication = await Medication.findByIdAndDelete(req.params.id);

    if (!medication) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Medication not found'
      });
    }

    logger.info(`Medication deleted: ${medication.name} by ${req.user.email}`);

    res.json({
      message: 'Medication deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting medication:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete medication'
    });
  }
});

module.exports = router;