import { Request, Response, NextFunction } from 'express';
import { webauthnService } from './webauthn.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import { setAuthCookies } from '../../lib/auth-cookies';
import { ValidationError } from '../../middlewares/errorHandler';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';

function meta(req: Request) {
  return { ip: req.ip ?? req.socket.remoteAddress, userAgent: req.headers['user-agent'] };
}

export const webauthnController = {
  async getRegistrationOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const options = await webauthnService.getRegistrationOptions(ctx);
      sendSuccess(res, options);
    } catch (err) { next(err); }
  },

  async verifyRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { response, deviceLabel } = req.body as { response?: RegistrationResponseJSON; deviceLabel?: string };
      if (!response) throw new ValidationError('A registration response is required');
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await webauthnService.verifyRegistration(ctx, response, deviceLabel);
      sendCreated(res, null, 'Passkey added — you can now sign in with it on this device.');
    } catch (err) { next(err); }
  },

  async listCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const credentials = await webauthnService.listCredentials(ctx);
      sendSuccess(res, credentials);
    } catch (err) { next(err); }
  },

  async deleteCredential(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await webauthnService.deleteCredential(ctx, req.params.id);
      sendSuccess(res, null, 'Passkey removed');
    } catch (err) { next(err); }
  },

  async getLoginOptions(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const options = await webauthnService.getLoginOptions();
      sendSuccess(res, options);
    } catch (err) { next(err); }
  },

  async verifyLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { response, challenge } = req.body as { response?: AuthenticationResponseJSON; challenge?: string };
      if (!response || !challenge) throw new ValidationError('A login response and challenge are required');
      const { refreshToken, ...result } = await webauthnService.verifyLogin(response, challenge, meta(req));
      setAuthCookies(res, refreshToken);
      sendCreated(res, result, 'Login successful');
    } catch (err) { next(err); }
  },
};
