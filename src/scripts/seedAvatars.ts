import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Avatar from '../models/Avatar';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const avatars = [
    // FEMALES
    { name: 'Artist Nexon (F)', image_url: '/Icons/F Artist Nexon.png' },
    { name: 'Baker Nexon (F)', image_url: '/Icons/F Baker Nexon.png' },
    { name: 'Bookworm Nexon (F)', image_url: '/Icons/F Bookwork Nexon.png' },
    { name: 'Caffeinated Nexon (F)', image_url: '/Icons/F Caffeinated Nexon.png' },
    { name: 'Cat Lover Nexon (F)', image_url: '/Icons/F Cat Lover Nexon.png' },
    { name: 'Cat Nexon (F)', image_url: '/Icons/F Cat Nexon.png' },
    { name: 'Chemical Engineer Nexon (F)', image_url: '/Icons/F Chemical Engineer Nexon.png' },
    { name: 'Chef Nexon (F)', image_url: '/Icons/F Chief Nexon.png' },
    { name: 'Civil Engineer Nexon (F)', image_url: '/Icons/F Civil Engineer Nexon.png' },
    { name: 'Comfy Nexon (F)', image_url: '/Icons/F Comfy Nexon.png' },
    { name: 'Computer Science Nexon (F)', image_url: '/Icons/F Computer Science Nexon.png' },
    { name: 'Electrical Engineer Nexon (F)', image_url: '/Icons/F Electrical Engineer Nexon.png' },
    { name: 'Mechanical Engineer Nexon (F)', image_url: '/Icons/F Mechanical Engineer Nexon.png' },
    { name: 'Smoothie Nexon (F)', image_url: '/Icons/F Smoothie Nexon.png' },
    { name: 'Social Butterfly Nexon (F)', image_url: '/Icons/F Social Butterfly Nexon.png' },

    // MALES
    { name: 'Artist Nexon (M)', image_url: '/Icons/M Artist Nexon.png' },
    { name: 'Aura Nexon (M)', image_url: '/Icons/M Aura Nexon.png' },
    { name: 'Biker Nexon (M)', image_url: '/Icons/M Biker Nexon.png' },
    { name: 'Chemical Engineer Nexon (M)', image_url: '/Icons/M Chemical Engineer Nexon.png' },
    { name: 'Civil Engineer Nexon (M)', image_url: '/Icons/M Civil Engineer Nexon.png' },
    { name: 'Computer Science Nexon (M)', image_url: '/Icons/M Computer Science Nexon.png' },
    { name: 'Electrical Engineer Nexon (M)', image_url: '/Icons/M Electrical Engineer Nexon.png' },
    { name: 'Gamer Nexon (M)', image_url: '/Icons/M Gamer Nexon.png' },
    { name: 'Glitch Nexon (M)', image_url: '/Icons/M Glitch Nexon.png' },
    { name: 'Graduate Nexon (M)', image_url: '/Icons/M Graduate Nexon.png' },
    { name: 'Happy Nexon (M)', image_url: '/Icons/M Happy Nexon.png' },
    { name: 'King Nexon (M)', image_url: '/Icons/M King Nexon.png' },
    { name: 'Mechanical Engineer Nexon (M)', image_url: '/Icons/M Mechanical Engineer Nexon.png' },
    { name: 'Sleepy Nexon (M)', image_url: '/Icons/M Sleepy Nexon.png' },
    { name: 'Sporty Nexon (M)', image_url: '/Icons/M Sporty Nexon.png' }
];

const seedAvatars = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Connected to MongoDB');

        // Clear existing avatars
        await Avatar.deleteMany({});
        console.log('Cleared existing avatars');

        const defaultNames = [
            // Engineering Females
            'Electrical Engineer Nexon (F)',
            'Computer Science Nexon (F)',
            'Mechanical Engineer Nexon (F)',
            'Civil Engineer Nexon (F)',
            'Chemical Engineer Nexon (F)',
            // Individual Females
            'Bookworm Nexon (F)', // Matches my previous name for 'Bookwork' file
            'Social Butterfly Nexon (F)',

            // Engineering Males
            'Electrical Engineer Nexon (M)',
            'Computer Science Nexon (M)',
            'Mechanical Engineer Nexon (M)',
            'Civil Engineer Nexon (M)',
            'Chemical Engineer Nexon (M)',
            // Individual Males
            'Graduate Nexon (M)',
            'Happy Nexon (M)',
            'Glitch Nexon (M)'
        ];

        const avatarsWithConfig = avatars.map(a => {
            const isDefault = defaultNames.includes(a.name);
            return {
                ...a,
                type: isDefault ? 'default' : 'reward',
                unlock_condition: isDefault ? 'none' : 'level_up', // Simple 'level_up' for now
                is_active: true
            };
        });

        // Insert new avatars
        const result = await Avatar.insertMany(avatarsWithConfig);

        console.log(`Seeded ${result.length} avatars successfully`);
        console.log(`Defaults: ${result.filter(a => a.type === 'default').length}`);
        console.log(`Rewards: ${result.filter(a => a.type === 'reward').length}`);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding avatars:', error);
        process.exit(1);
    }
};

seedAvatars();
