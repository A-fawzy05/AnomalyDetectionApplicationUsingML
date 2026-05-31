const Team = require('../models/Team');
const User = require('../models/User');
const https = require('https');

class TeamController {
  // POST /api/teams/create
  static async create(req, res) {
    try {
      const { name, joinPassword, confirmPassword } = req.body;
      if (!name || !joinPassword || !confirmPassword)
        return res.status(400).json({ success: false, message: 'name, joinPassword, and confirmPassword are required' });
      if (joinPassword !== confirmPassword)
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
      if (joinPassword.length < 4)
        return res.status(400).json({ success: false, message: 'Join password must be at least 4 characters' });

      const existing = await Team.findOne({ name: name.trim() });
      if (existing)
        return res.status(409).json({ success: false, message: 'A team with this name already exists' });

      const team = new Team({
        name: name.trim(),
        joinPassword,
        createdBy: req.user.userId,
        members: [{ userId: req.user.userId, role: 'admin' }]
      });
      await team.save();

      await User.findByIdAndUpdate(req.user.userId, {
        $push: { teams: { teamId: team._id, role: 'admin' } }
      });

      res.status(201).json({
        success: true,
        message: 'Team created successfully',
        data: { id: team._id, name: team.name, role: 'admin', memberCount: 1, createdAt: team.createdAt }
      });
    } catch (err) {
      if (err.code === 11000)
        return res.status(409).json({ success: false, message: 'A team with this name already exists' });
      console.error('Create team error:', err);
      res.status(500).json({ success: false, message: 'Failed to create team' });
    }
  }

  // POST /api/teams/join
  static async join(req, res) {
    try {
      const { name, joinPassword } = req.body;
      if (!name || !joinPassword)
        return res.status(400).json({ success: false, message: 'name and joinPassword are required' });

      const team = await Team.findOne({ name: name.trim() }).select('+joinPassword');
      if (!team)
        return res.status(404).json({ success: false, message: 'Team not found' });

      const already = team.members.some(m => m.userId.toString() === req.user.userId.toString());
      if (already)
        return res.status(409).json({ success: false, message: 'You are already a member of this team' });

      const valid = await team.compareJoinPassword(joinPassword);
      if (!valid)
        return res.status(401).json({ success: false, message: 'Incorrect join password' });

      team.members.push({ userId: req.user.userId, role: 'member' });
      await team.save();

      await User.findByIdAndUpdate(req.user.userId, {
        $push: { teams: { teamId: team._id, role: 'member' } }
      });

      res.json({
        success: true,
        message: `Successfully joined "${team.name}"`,
        data: { id: team._id, name: team.name, role: 'member', memberCount: team.members.length }
      });
    } catch (err) {
      console.error('Join team error:', err);
      res.status(500).json({ success: false, message: 'Failed to join team' });
    }
  }

  // GET /api/teams/my-teams
  static async getMyTeams(req, res) {
    try {
      const teams = await Team.find({ 'members.userId': req.user.userId })
        .select('name members createdBy createdAt subteams');

      const result = teams.map(t => {
        const membership = t.members.find(m => m.userId.toString() === req.user.userId.toString());
        const isAdmin = membership?.role === 'admin';
        return {
          id: t._id,
          name: t.name,
          role: membership?.role || 'member',
          memberCount: t.members.length,
          isCreator: t.createdBy.toString() === req.user.userId.toString(),
          createdAt: t.createdAt,
          subteams: t.subteams.map(s => ({
            id: s._id,
            name: s.name,
            fastApiRunId: s.fastApiRunId || null,
            djangoEventLogId: s.djangoEventLogId || null,
            createdAt: s.createdAt
          }))
        };
      });

      res.json({ success: true, data: result });
    } catch (err) {
      console.error('Get teams error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch teams' });
    }
  }

  // DELETE /api/teams/:id
  static async deleteTeam(req, res) {
    try {
      const team = await Team.findById(req.params.id);
      if (!team)
        return res.status(404).json({ success: false, message: 'Team not found' });
      if (team.createdBy.toString() !== req.user.userId.toString())
        return res.status(403).json({ success: false, message: 'Only the team admin can delete this team' });

      await User.updateMany(
        { 'teams.teamId': req.params.id },
        { $pull: { teams: { teamId: req.params.id } } }
      );
      await Team.findByIdAndDelete(req.params.id);

      res.json({ success: true, message: 'Team deleted successfully' });
    } catch (err) {
      console.error('Delete team error:', err);
      res.status(500).json({ success: false, message: 'Failed to delete team' });
    }
  }

  // POST /api/teams/:id/subteams
  static async createSubteam(req, res) {
    try {
      const { name } = req.body;
      if (!name)
        return res.status(400).json({ success: false, message: 'Subteam name is required' });

      const team = await Team.findById(req.params.id);
      if (!team)
        return res.status(404).json({ success: false, message: 'Team not found' });

      const membership = team.members.find(m => m.userId.toString() === req.user.userId.toString());
      if (!membership || membership.role !== 'admin')
        return res.status(403).json({ success: false, message: 'Only team admins can create subteams' });

      const nameTaken = team.subteams.some(s => s.name.toLowerCase() === name.trim().toLowerCase());
      if (nameTaken)
        return res.status(409).json({ success: false, message: 'A subteam with this name already exists in this team' });

      team.subteams.push({ name: name.trim() });
      await team.save();
      const created = team.subteams[team.subteams.length - 1];

      res.status(201).json({
        success: true,
        message: 'Subteam created successfully',
        data: { id: created._id, name: created.name, fastApiRunId: null, djangoEventLogId: null }
      });
    } catch (err) {
      console.error('Create subteam error:', err);
      res.status(500).json({ success: false, message: 'Failed to create subteam' });
    }
  }

  // DELETE /api/teams/:id/subteams/:subId
  static async deleteSubteam(req, res) {
    try {
      const team = await Team.findById(req.params.id);
      if (!team)
        return res.status(404).json({ success: false, message: 'Team not found' });

      const membership = team.members.find(m => m.userId.toString() === req.user.userId.toString());
      if (!membership || membership.role !== 'admin')
        return res.status(403).json({ success: false, message: 'Only team admins can delete subteams' });

      const subteamIndex = team.subteams.findIndex(s => s._id.toString() === req.params.subId);
      if (subteamIndex === -1)
        return res.status(404).json({ success: false, message: 'Subteam not found' });

      team.subteams.splice(subteamIndex, 1);
      await team.save();

      res.json({ success: true, message: 'Subteam deleted successfully' });
    } catch (err) {
      console.error('Delete subteam error:', err);
      res.status(500).json({ success: false, message: 'Failed to delete subteam' });
    }
  }

  // PATCH /api/teams/:id/subteams/:subId/data
  static async updateSubteamData(req, res) {
    try {
      const { fastApiRunId, djangoEventLogId } = req.body;

      const team = await Team.findById(req.params.id);
      if (!team)
        return res.status(404).json({ success: false, message: 'Team not found' });

      const isMember = team.members.some(m => m.userId.toString() === req.user.userId.toString());
      if (!isMember)
        return res.status(403).json({ success: false, message: 'You are not a member of this team' });

      const subteam = team.subteams.id(req.params.subId);
      if (!subteam)
        return res.status(404).json({ success: false, message: 'Subteam not found' });

      if (fastApiRunId !== undefined) subteam.fastApiRunId = fastApiRunId;
      if (djangoEventLogId !== undefined) subteam.djangoEventLogId = djangoEventLogId;
      await team.save();

      res.json({
        success: true,
        message: 'Subteam data updated',
        data: { fastApiRunId: subteam.fastApiRunId, djangoEventLogId: subteam.djangoEventLogId }
      });
    } catch (err) {
      console.error('Update subteam data error:', err);
      res.status(500).json({ success: false, message: 'Failed to update subteam data' });
    }
  }

  // GET /api/teams/:id/subteams/:subId
  static async getSubteam(req, res) {
    try {
      const team = await Team.findById(req.params.id).select('name members subteams');
      if (!team)
        return res.status(404).json({ success: false, message: 'Team not found' });

      const isMember = team.members.some(m => m.userId.toString() === req.user.userId.toString());
      if (!isMember)
        return res.status(403).json({ success: false, message: 'You are not a member of this team' });

      const subteam = team.subteams.id(req.params.subId);
      if (!subteam)
        return res.status(404).json({ success: false, message: 'Subteam not found' });

      res.json({
        success: true,
        data: {
          id: subteam._id,
          name: subteam.name,
          fastApiRunId: subteam.fastApiRunId || null,
          djangoEventLogId: subteam.djangoEventLogId || null,
          teamId: team._id,
          teamName: team.name
        }
      });
    } catch (err) {
      console.error('Get subteam error:', err);
      res.status(500).json({ success: false, message: 'Failed to get subteam' });
    }
  }

  // GET /api/teams/:id/admin-telegram
  static async getAdminTelegram(req, res) {
    try {
      const team = await Team.findById(req.params.id).select('members');
      if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

      const isMember = team.members.some(m => m.userId.toString() === req.user.userId.toString());
      if (!isMember) return res.status(403).json({ success: false, message: 'Not a member of this team' });

      const adminMember = team.members.find(m => m.role === 'admin');
      if (!adminMember) return res.status(404).json({ success: false, message: 'No admin found for this team' });

      const adminUser = await User.findById(adminMember.userId).select('fullName telegramChatId');
      if (!adminUser) return res.status(404).json({ success: false, message: 'Admin user not found' });

      res.json({
        success: true,
        data: {
          hasTelegram: !!adminUser.telegramChatId,
          chatId: adminUser.telegramChatId || null,
          adminName: adminUser.fullName,
        }
      });
    } catch (err) {
      console.error('getAdminTelegram error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch admin Telegram info' });
    }
  }

  // POST /api/teams/:id/send-telegram-report
  static async sendTelegramReport(req, res) {
    try {
      const { reportMarkdown, teamName, subteamName, senderName } = req.body;
      if (!reportMarkdown) return res.status(400).json({ success: false, message: 'reportMarkdown is required' });

      const team = await Team.findById(req.params.id).select('name members');
      if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

      const isMember = team.members.some(m => m.userId.toString() === req.user.userId.toString());
      if (!isMember) return res.status(403).json({ success: false, message: 'Not a member of this team' });

      const adminMember = team.members.find(m => m.role === 'admin');
      if (!adminMember) return res.status(404).json({ success: false, message: 'No admin found for this team' });

      const adminUser = await User.findById(adminMember.userId).select('fullName telegramChatId');
      if (!adminUser || !adminUser.telegramChatId) {
        return res.status(400).json({ success: false, message: 'Team admin has no Telegram linked' });
      }

      const webhookUrl = process.env.N8N_TELEGRAM_WEBHOOK_URL;
      if (!webhookUrl) return res.status(503).json({ success: false, message: 'Telegram notification service not configured' });

      const n8nRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminUser.telegramChatId,
          admin_name: adminUser.fullName,
          team_name: teamName || team.name,
          subteam_name: subteamName || 'Unknown subteam',
          sender_name: senderName || 'A team member',
          report_markdown: reportMarkdown,
        }),
      });

      const telegramData = await n8nRes.json();
      if (!n8nRes.ok) {
        return res.status(502).json({ success: false, message: telegramData?.message || 'Failed to trigger notification workflow' });
      }

      res.json({ success: true, message: `Report sent to ${adminUser.fullName} on Telegram` });
    } catch (err) {
      console.error('sendTelegramReport error:', err);
      res.status(500).json({ success: false, message: 'Failed to send Telegram report' });
    }
  }
}

module.exports = TeamController;
