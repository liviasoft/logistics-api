import { ObjectId } from 'bson';
import { Case } from 'change-case-all';

export abstract class BaseService {
  createResourceId(resourceName: string) {
    return `${Case.snake(resourceName)}-${new ObjectId().toString()}`;
  }

  paginate(total: number, limit: number, page: number) {
    const pages = Math.ceil(total / limit) || 1;
    const prev = pages > 1 && page <= pages && page > 0 ? page - 1 : null;
    const next = pages > 1 && page < pages && page > 0 ? page + 1 : null;
    return { total, page, pages, limit, prev, next };
  }

  formatResponse({
    success = true,
    data = undefined,
    message = 'OK',
    error = undefined,
    statusCode = 200,
  }) {
    return { success, data, message, error, statusCode };
  }
}
