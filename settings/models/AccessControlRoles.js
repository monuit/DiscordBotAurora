const mongoose = require("mongoose");

const AccessControlRolesSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    roleId: {
        type: String,
        required: true
    },
    roleName: {
        type: String,
        default: 'Unknown'
    },
    addedBy: {
        type: String,
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    accessType: {
        type: String,
        enum: ['FULL_ACCESS', 'COMMANDS_ONLY', 'VIEW_ONLY'],
        default: 'FULL_ACCESS'
    }
});

// Compound index for efficient queries
AccessControlRolesSchema.index({ guildId: 1, roleId: 1 });
AccessControlRolesSchema.index({ guildId: 1, isActive: 1 });

module.exports = mongoose.model("AccessControlRoles", AccessControlRolesSchema);
