import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import Avatar from '../models/Avatar';

// Define path to Icons folder
// Assuming server is in d:/Projects/Nexus4D/server and needed path is d:/Projects/Nexus4D/frontend/public/Icons
// @desc    Get all avatars (Admin)
// @route   GET /api/avatar/all
// @access  Private (Admin)
export const getAllAvatars = async (req: Request, res: Response) => {
    try {
        const avatars = await Avatar.find({}).sort({ createdAt: -1 });
        res.json(avatars);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new avatar
// @route   POST /api/avatar
// @access  Private (Admin)
export const createAvatar = async (req: Request, res: Response) => {
    try {
        const { name, image_url, type, unlock_condition, required_level, is_active } = req.body;

        const avatar = await Avatar.create({
            name,
            image_url,
            type,
            unlock_condition,
            required_level,
            is_active
        });

        res.status(201).json(avatar);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update avatar
// @route   PUT /api/avatar/:id
// @access  Private (Admin)
export const updateAvatar = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const avatar = await Avatar.findByIdAndUpdate(id, req.body, { new: true });
        
        if (!avatar) return res.status(404).json({ message: 'Avatar not found' });

        res.json(avatar);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete avatar
// @route   DELETE /api/avatar/:id
// @access  Private (Admin)
export const deleteAvatar = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await Avatar.findByIdAndDelete(id);
        res.json({ message: 'Avatar deleted' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Bulk update avatar categories
// @route   PUT /api/avatar/bulk-update-category
// @access  Private (Admin)
export const bulkUpdateCategories = async (req: Request, res: Response) => {
    try {
        const { category } = req.body;
        
        if (!['male', 'female', 'general', 'admin'].includes(category)) {
             return res.status(400).json({ message: 'Invalid category' });
        }

        const result = await Avatar.updateMany(
            {}, // Update ALL documents
            { $set: { category } } 
        );

        res.json({ message: `Updated ${result.modifiedCount} avatars to category: ${category}` });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
