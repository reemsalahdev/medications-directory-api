const express = require('express');
const Pharmacy = require('../models/Pharmacy');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Pharmacy:
 *       type: object
 *       required:
 *         - name
 *         - location
 *         - contactInfo
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         location:
 *           type: object
 *           properties:
 *             address:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *             coordinates:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                 longitude:
 *                   type: number
 *         contactInfo:
 *           type: object
 *           properties:
 *             phone:
 *               type: string
 *             email:
 *               type: string
 *             website:
 *               type: string
 *         operatingHours:
 *           type: object
 *         services:
 *           type: array
 *           items:
 *             type: string
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/pharmacies:
 *   get:
 *     summary: Get all pharmacies
 *     tags: [Pharmacies]
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
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of pharmacies
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.city) filter['location.city'] = new RegExp(req.query.city, 'i');
    if (req.query.state) filter['location.state'] = new RegExp(req.query.state, 'i');
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const pharmacies = await Pharmacy.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Pharmacy.countDocuments(filter);

    res.json({
      pharmacies,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    logger.error('Error fetching pharmacies:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch pharmacies'
    });
  }
});

/**
 * @swagger
 * /api/pharmacies/{id}:
 *   get:
 *     summary: Get pharmacy by ID
 *     tags: [Pharmacies]
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
 *         description: Pharmacy details
 *       404:
 *         description: Pharmacy not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findById(req.params.id);

    if (!pharmacy) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Pharmacy not found'
      });
    }

    res.json(pharmacy);
  } catch (error) {
    logger.error('Error fetching pharmacy:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch pharmacy'
    });
  }
});

/**
 * @swagger
 * /api/pharmacies:
 *   post:
 *     summary: Create new pharmacy
 *     tags: [Pharmacies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Pharmacy'
 *     responses:
 *       201:
 *         description: Pharmacy created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, requireAdmin, validateRequest(schemas.pharmacy), async (req, res) => {
  try {
    const pharmacy = new Pharmacy(req.body);
    await pharmacy.save();

    logger.info(`Pharmacy created: ${pharmacy.name} by ${req.user.email}`);

    res.status(201).json({
      message: 'Pharmacy created successfully',
      pharmacy
    });
  } catch (error) {
    logger.error('Error creating pharmacy:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create pharmacy'
    });
  }
});

/**
 * @swagger
 * /api/pharmacies/{id}:
 *   put:
 *     summary: Update pharmacy
 *     tags: [Pharmacies]
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
 *             $ref: '#/components/schemas/Pharmacy'
 *     responses:
 *       200:
 *         description: Pharmacy updated successfully
 *       404:
 *         description: Pharmacy not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', authenticateToken, requireAdmin, validateRequest(schemas.pharmacy), async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!pharmacy) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Pharmacy not found'
      });
    }

    logger.info(`Pharmacy updated: ${pharmacy.name} by ${req.user.email}`);

    res.json({
      message: 'Pharmacy updated successfully',
      pharmacy
    });
  } catch (error) {
    logger.error('Error updating pharmacy:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update pharmacy'
    });
  }
});

/**
 * @swagger
 * /api/pharmacies/{id}:
 *   delete:
 *     summary: Delete pharmacy
 *     tags: [Pharmacies]
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
 *         description: Pharmacy deleted successfully
 *       404:
 *         description: Pharmacy not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findByIdAndDelete(req.params.id);

    if (!pharmacy) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Pharmacy not found'
      });
    }

    logger.info(`Pharmacy deleted: ${pharmacy.name} by ${req.user.email}`);

    res.json({
      message: 'Pharmacy deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting pharmacy:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete pharmacy'
    });
  }
});

module.exports = router;