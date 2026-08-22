const mongoose = require("mongoose");
const Issue = require("../models/issue");

const normalizeIssue = (issue) => ({
  ...issue.toObject(),
  id: issue.issueId
});

const buildGeoLocation = (coordinates) => {
  if (
    !coordinates ||
    coordinates.lat == null ||
    coordinates.lng == null
  ) {
    return undefined;
  }

  const lat = Number(coordinates.lat);
  const lng = Number(coordinates.lng);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return undefined;
  }

  return {
    type: "Point",
    coordinates: [lng, lat]
  };
};

async function listIssues(req, res, next) {
  try {
    const {
      status,
      category,
      priority,
      limit = 500
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const safeLimit = Math.min(
      Math.max(Number(limit) || 500, 1),
      1000
    );

    const issues = await Issue.find(filter)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean();

    res.json(
      issues.map((issue) => ({
        ...issue,
        id: issue.issueId
      }))
    );
  } catch (error) {
    next(error);
  }
}

async function getNearbyIssues(req, res, next) {
  try {
    const {
      lat,
      lng,
      radius = 5000,
      status,
      category,
      priority,
      limit = 200
    } = req.query;

    const latitude = Number(lat);
    const longitude = Number(lng);
    const maxDistance = Number(radius);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        message: "Invalid latitude or longitude."
      });
    }

    if (
      !Number.isFinite(maxDistance) ||
      maxDistance <= 0 ||
      maxDistance > 50000
    ) {
      return res.status(400).json({
        message: "Radius must be between 1 and 50000 meters."
      });
    }

    const safeLimit = Math.min(
      Math.max(Number(limit) || 200, 1),
      500
    );

    const filter = {
      geoLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      }
    };

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const issues = await Issue.find(filter)
      .limit(safeLimit)
      .lean();

    res.json(
      issues.map((issue) => ({
        ...issue,
        id: issue.issueId
      }))
    );
  } catch (error) {
    next(error);
  }
}

async function getIssueStats(req, res, next) {
  try {
    const [
      total,
      unresolved,
      resolved,
      critical,
      categoryStats,
      statusStats,
      priorityStats
    ] = await Promise.all([
      Issue.countDocuments(),

      Issue.countDocuments({
        status: {
          $nin: ["Resolved", "Closed"]
        }
      }),

      Issue.countDocuments({
        status: {
          $in: ["Resolved", "Closed"]
        }
      }),

      Issue.countDocuments({
        priority: "Critical"
      }),

      Issue.aggregate([
        {
          $group: {
            _id: "$category",
            count: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            count: -1
          }
        }
      ]),

      Issue.aggregate([
        {
          $group: {
            _id: "$status",
            count: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            count: -1
          }
        }
      ]),

      Issue.aggregate([
        {
          $group: {
            _id: "$priority",
            count: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            count: -1
          }
        }
      ])
    ]);

    res.json({
      total,
      unresolved,
      resolved,
      critical,
      categories: categoryStats.map((item) => ({
        category: item._id,
        count: item.count
      })),
      statuses: statusStats.map((item) => ({
        status: item._id,
        count: item.count
      })),
      priorities: priorityStats.map((item) => ({
        priority: item._id,
        count: item.count
      }))
    });
  } catch (error) {
    next(error);
  }
}

async function getIssue(req, res, next) {
  try {
    const issue = await Issue.findOne({
      $or: [
        {
          issueId: req.params.id
        },
        ...(mongoose.isValidObjectId(req.params.id)
          ? [
              {
                _id: req.params.id
              }
            ]
          : [])
      ]
    });

    if (!issue) {
      return res.status(404).json({
        message: "Issue not found."
      });
    }

    res.json(normalizeIssue(issue));
  } catch (error) {
    next(error);
  }
}

async function createIssue(req, res, next) {
  try {
    const {
      id,
      title,
      description,
      category,
      priority,
      status,
      location,
      lat,
      lng,
      coordinates,
      reportedBy,
      assignedTo,
      evidence
    } = req.body;

    const normalizedCoordinates =
      coordinates ||
      (lat != null && lng != null
        ? {
            lat: Number(lat),
            lng: Number(lng)
          }
        : undefined);

    const geoLocation =
      buildGeoLocation(normalizedCoordinates);

    const issue = await Issue.create({
      issueId: id,
      title,
      description,
      category,
      priority,
      status: status || "Reported",
      location,
      coordinates: normalizedCoordinates,
      geoLocation,
      reportedBy,
      assignedTo,
      evidence
    });

    res.status(201).json(
      normalizeIssue(issue)
    );
  } catch (error) {
    next(error);
  }
}

async function updateIssue(req, res, next) {
  try {
    const allowed = [
      "title",
      "description",
      "category",
      "priority",
      "status",
      "location",
      "coordinates",
      "assignedTo"
    ];

    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.coordinates) {
      const geoLocation =
        buildGeoLocation(updates.coordinates);

      if (geoLocation) {
        updates.geoLocation = geoLocation;
      }
    }

    const issue = await Issue.findOneAndUpdate(
      {
        issueId: req.params.id
      },
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    if (!issue) {
      return res.status(404).json({
        message: "Issue not found."
      });
    }

    res.json(
      normalizeIssue(issue)
    );
  } catch (error) {
    next(error);
  }
}

async function deleteIssue(req, res, next) {
  try {
    const result = await Issue.deleteOne({
      issueId: req.params.id
    });

    if (!result.deletedCount) {
      return res.status(404).json({
        message: "Issue not found."
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listIssues,
  getNearbyIssues,
  getIssueStats,
  getIssue,
  createIssue,
  updateIssue,
  deleteIssue
};