import resourceService from '../services/resourceService.js';

export async function listResources(req, res, next) {
  try {
    const result = await resourceService.listResources({ query: req.query, user: req.user });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getResource(req, res, next) {
  try {
    const resource = await resourceService.getResourceById(req.params.id, req.user);
    return res.status(200).json({ data: resource });
  } catch (err) {
    next(err);
  }
}

export async function getResourceAvailability(req, res, next) {
  try {
    const { from, to } = req.query;
    const data = await resourceService.getResourceAvailability(
      req.params.id,
      from,
      to,
      req.user
    );
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function createResource(req, res, next) {
  try {
    const resource = await resourceService.createResource(req.body);
    return res.status(201).json({ data: resource });
  } catch (err) {
    next(err);
  }
}

export async function updateResource(req, res, next) {
  try {
    const resource = await resourceService.updateResource(req.params.id, req.body);
    return res.status(200).json({ data: resource });
  } catch (err) {
    next(err);
  }
}

export async function deleteResource(req, res, next) {
  try {
    const resource = await resourceService.softDeleteResource(req.params.id);
    return res.status(200).json({ data: resource });
  } catch (err) {
    next(err);
  }
}

export default {
  listResources,
  getResource,
  getResourceAvailability,
  createResource,
  updateResource,
  deleteResource,
};
