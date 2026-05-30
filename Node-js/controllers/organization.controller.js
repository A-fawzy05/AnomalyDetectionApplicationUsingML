const Organization = require('../models/Organization');
const User = require('../models/User');

class OrganizationController {
  // POST /api/org/create
  static async create(req, res) {
    try {
      const { name, joinPassword, confirmPassword } = req.body;

      if (!name || !joinPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Organization name, join password, and confirm password are required'
        });
      }

      if (joinPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match'
        });
      }

      if (joinPassword.length < 4) {
        return res.status(400).json({
          success: false,
          message: 'Join password must be at least 4 characters'
        });
      }

      // Check if org name already exists
      const existingOrg = await Organization.findOne({ name: name.trim() });
      if (existingOrg) {
        return res.status(409).json({
          success: false,
          message: 'An organization with this name already exists'
        });
      }

      // Create organization with creator as admin
      const organization = new Organization({
        name: name.trim(),
        joinPassword,
        createdBy: req.user.userId,
        members: [{
          userId: req.user.userId,
          role: 'admin',
          canViewDashboard: true
        }]
      });

      await organization.save();

      // Add organization to user's organizations array
      await User.findByIdAndUpdate(req.user.userId, {
        $push: {
          organizations: {
            organizationId: organization._id,
            role: 'admin'
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Organization created successfully',
        data: {
          id: organization._id,
          name: organization.name,
          role: 'admin',
          memberCount: 1,
          createdAt: organization.createdAt
        }
      });
    } catch (error) {
      console.error('Create organization error:', error);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'An organization with this name already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create organization'
      });
    }
  }

  // POST /api/org/join
  static async join(req, res) {
    try {
      const { name, joinPassword } = req.body;

      if (!name || !joinPassword) {
        return res.status(400).json({
          success: false,
          message: 'Organization name and join password are required'
        });
      }

      // Find organization with password field included
      const organization = await Organization.findOne({ name: name.trim() }).select('+joinPassword');
      if (!organization) {
        return res.status(404).json({
          success: false,
          message: 'Organization not found'
        });
      }

      // Check if user is already a member
      const isMember = organization.members.some(
        m => m.userId.toString() === req.user.userId.toString()
      );
      if (isMember) {
        return res.status(409).json({
          success: false,
          message: 'You are already a member of this organization'
        });
      }

      // Verify join password
      const isPasswordValid = await organization.compareJoinPassword(joinPassword);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect join password'
        });
      }

      // Add user as member
      organization.members.push({
        userId: req.user.userId,
        role: 'member',
        canViewDashboard: false
      });
      await organization.save();

      // Add organization to user's organizations array
      await User.findByIdAndUpdate(req.user.userId, {
        $push: {
          organizations: {
            organizationId: organization._id,
            role: 'member'
          }
        }
      });

      res.status(200).json({
        success: true,
        message: `Successfully joined "${organization.name}"`,
        data: {
          id: organization._id,
          name: organization.name,
          role: 'member',
          memberCount: organization.members.length
        }
      });
    } catch (error) {
      console.error('Join organization error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to join organization'
      });
    }
  }

  // GET /api/org/my-orgs
  static async getMyOrgs(req, res) {
    try {
      const organizations = await Organization.find({
        'members.userId': req.user.userId
      }).select('name members createdBy createdAt lastRunId');

      const result = organizations.map(org => {
        const membership = org.members.find(
          m => m.userId.toString() === req.user.userId.toString()
        );
        return {
          id: org._id,
          name: org.name,
          role: membership ? membership.role : 'member',
          canViewDashboard: membership ? membership.canViewDashboard : false,
          memberCount: org.members.length,
          isCreator: org.createdBy.toString() === req.user.userId.toString(),
          createdAt: org.createdAt,
          lastRunId: org.lastRunId || null
        };
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get organizations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch organizations'
      });
    }
  }

  // PATCH /api/org/:id/run  — save the last analysis run_id on the organization
  static async updateRunId(req, res) {
    try {
      const { id } = req.params;
      const { runId } = req.body;

      if (!runId) {
        return res.status(400).json({ success: false, message: 'runId is required' });
      }

      const organization = await Organization.findById(id);
      if (!organization) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
      }

      // Only members of the org can set the run id
      const isMember = organization.members.some(
        m => m.userId.toString() === req.user.userId.toString()
      );
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'You are not a member of this organization' });
      }

      organization.lastRunId = runId;
      await organization.save();

      res.json({
        success: true,
        message: 'Run ID saved to organization',
        data: { organizationId: id, lastRunId: organization.lastRunId }
      });
    } catch (error) {
      console.error('Update org run ID error:', error);
      res.status(500).json({ success: false, message: 'Failed to update run ID' });
    }
  }

  // DELETE /api/org/:id
  static async deleteOrg(req, res) {
    try {
      const { id } = req.params;

      // Find organization
      const organization = await Organization.findById(id);
      if (!organization) {
        return res.status(404).json({
          success: false,
          message: 'Organization not found'
        });
      }

      // Check if user is the creator/admin
      if (organization.createdBy.toString() !== req.user.userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Only the organization administrator can delete this organization'
        });
      }

      // Remove the organization reference from all users
      await User.updateMany(
        { 'organizations.organizationId': id },
        { $pull: { organizations: { organizationId: id } } }
      );

      // Delete the organization
      await Organization.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'Organization deleted successfully'
      });
    } catch (error) {
      console.error('Delete organization error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete organization'
      });
    }
  }
}

module.exports = OrganizationController;
