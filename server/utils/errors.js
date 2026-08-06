class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

class NotFoundError extends HttpError {
  constructor(message = '対象が見つかりません') {
    super(404, message);
  }
}

class ValidationError extends HttpError {
  constructor(message = '入力内容が不正です') {
    super(400, message);
  }
}

module.exports = { HttpError, NotFoundError, ValidationError };
