const express = require('express');
const Alternative = require('../models/Alternative');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Alternative:
 *       type: object
 *       required:
 *         - originalMedication
 *         - name
 *         - manufacturer
 *         - priceRange
 *       properties:
 *         id:
 *           type: string
 *         originalMedication:
 *           type: string
 *         name:
 *           type: string
 *         manufacturer:
 *           type: string
 *         availablePharmacies:
 *           type: array
 *           items:
 *             type: string
 *         priceRange:
 *           type: object
 *           properties:
 *             min:
 *               type: number
 *             max:
 *               type: number
 *             currency:
 *               type: string
 *         activeIngredient:
 *           type: string
 *         dosageForm:
 *           type: string
 *         strength:
 *           type: string
 *         notes:
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
 * /api/alternatives:
 *   get:
 *     summary: Get all alternatives
 *     tags: [Alternatives]
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
 *         name: originalMedication
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of alternatives
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.originalMedication) {
      filter.originalMedication = req.query.originalMedication;
    }

    const alternatives = await Alternative.find(filter)
      .populate('originalMedication', 'name manufacturer category')
      .populate('availablePharmacies', 'name location.city location.state')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Alternative.countDocuments(filter);

    res.json({
      alternatives,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    logger.error('Error fetching alternatives:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch alternatives'
    });
  }
});

/**
 * @swagger
 * /api/alternatives/{id}:
 *   get:
 *     summary: Get alternative by ID
 *     tags: [Alternatives]
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
 *         description: Alternative details
 *       404:
 *         description: Alternative not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const alternative = await Alternative.findById(req.params.id)
      .populate('originalMedication')
      .populate('availablePharmacies');

    if (!alternative) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Alternative not found'
      });
    }

    res.json(alternative);
  } catch (error) {
    logger.error('Error fetching alternative:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch alternative'
    });
  }
});

/**
 * @swagger
 * /api/alternatives:
 *   post:
 *     summary: Create new alternative
 *     tags: [Alternatives]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Alternative'
 *     responses:
 *       201:
 *         description: Alternative created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, requireAdmin, validateRequest(schemas.alternative), async (req, res) => {
  try {
    const alternative = new Alternative(req.body);
    await alternative.save();
    
    await alternative.populate('originalMedication');
    await alternative.populate('availablePharmacies');

    logger.info(`Alternative created: ${alternative.name} by ${req.user.email}`);

    res.status(201).json({
      message: 'Alternative created successfully',
      alternative
    });
  } catch (error) {
    logger.error('Error creating alternative:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create alternative'
    });
  }
});

/**
 * @swagger
 * /api/alternatives/{id}:
 *   put:
 *     summary: Update alternative
 *     tags: [Alternatives]
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
 *             $ref: '#/components/schemas/Alternative'
 *     responses:
 *       200:
 *         description: Alternative updated successfully
 *       404:
 *         description: Alternative not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', authenticateToken, requireAdmin, validateRequest(schemas.alternative), async (req, res) => {
  try {
    const alternative = await Alternative.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('originalMedication').populate('availablePharmacies');

    if (!alternative) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Alternative not found'
      });
    }

    logger.info(`Alternative updated: ${alternative.name} by ${req.user.email}`);

    res.json({
      message: 'Alternative updated successfully',
      alternative
    });
  } catch (error) {
    logger.error('Error updating alternative:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update alternative'
    });
  }
});

/**
 * @swagger
 * /api/alternatives/{id}:
 *   delete:
 *     summary: Delete alternative
 *     tags: [Alternatives]
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
 *         description: Alternative deleted successfully
 *       404:
 *         description: Alternative not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const alternative = await Alternative.findByIdAndDelete(req.params.id);

    if (!alternative) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Alternative not found'
      });
    }

    logger.info(`Alternative deleted: ${alternative.name} by ${req.user.email}`);

    res.json({
      message: 'Alternative deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting alternative:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete alternative'
    });
  }
});

module.exports = router;