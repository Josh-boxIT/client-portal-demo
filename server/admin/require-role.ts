import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AdminRole } from '../db/schema';

/** preHandler that 403s unless the authenticated admin has one of `roles`. */
export function requireRole(...roles: AdminRole[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const identity = req.adminIdentity;
    if (!identity || !roles.includes(identity.role)) {
      return reply.status(403).send({
        error: { code: 'forbidden', message: 'Insufficient role for this action' },
      });
    }
  };
}
