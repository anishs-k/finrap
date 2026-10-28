export function sendCreated(res, data) {
  return res.status(201).json(data);
}

export function sendOk(res, data) {
  return res.json(data);
}
