import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

// Este Guard usa automaticamente a JwtStrategy que criamos
// Ele verifica se o token JWT no header é válido
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    // AuthGuard('jwt') procura pela Strategy com nome 'jwt'
    // Por padrão, PassportStrategy(Strategy) tem nome 'jwt'

    // Se o token for válido, a request continua
    // Se inválido, retorna 401 Unauthorized automaticamente
}