const userRepository = require('../repositories/userRepository');
const authService = require('./auth.service');

class UserService {
  async listUsers(tenantSlug) {
    return await userRepository.findAll(tenantSlug);
  }

  async getUser(id, tenantSlug) {
    const user = await userRepository.findById(id, tenantSlug);
    if (!user) {
      const err = new Error('Usuário não encontrado.');
      err.statusCode = 404;
      throw err;
    }
    const { senha: _, ...safeUser } = user;
    return safeUser;
  }

  async createUser(userData, tenantSlug) {
    if (!userData.nome || !userData.email || !userData.senha || !userData.role) {
      const err = new Error('Nome, e-mail, senha e perfil (role) são obrigatórios.');
      err.statusCode = 400;
      throw err;
    }

    const cleanEmail = userData.email.trim().toLowerCase();
    const existing = await userRepository.findByEmailOrAlias(cleanEmail, tenantSlug);
    if (existing) {
      const err = new Error('Já existe um usuário cadastrado com este e-mail.');
      err.statusCode = 400;
      throw err;
    }

    const hashedPassword = await authService.hashPassword(userData.senha);
    const now = new Date().toISOString();

    const newUser = {
      id: userData.id || ('usr_' + Date.now()),
      nome: userData.nome.trim(),
      email: cleanEmail,
      senha: hashedPassword,
      role: userData.role,
      cargo: userData.cargo?.trim() || '',
      telefone: userData.telefone?.trim() || '',
      ativo: userData.ativo !== undefined ? userData.ativo : 1,
      createdAt: now,
      updatedAt: now
    };

    const saved = await userRepository.create(newUser, tenantSlug);
    const { senha: _, ...safeUser } = saved;
    return safeUser;
  }

  async updateUser(id, updateData, tenantSlug) {
    if (id === 'usr_root') {
      const err = new Error('O usuário raiz (root) do sistema é reservado e protegido.');
      err.statusCode = 403;
      throw err;
    }

    const existing = await userRepository.findById(id, tenantSlug);
    if (!existing) {
      const err = new Error('Usuário não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    const dataToUpdate = { ...updateData };

    if (updateData.email) {
      dataToUpdate.email = updateData.email.trim().toLowerCase();
    }

    if (updateData.senha && updateData.senha.trim() !== '') {
      dataToUpdate.senha = await authService.hashPassword(updateData.senha);
    } else {
      delete dataToUpdate.senha;
    }

    const updated = await userRepository.update(id, dataToUpdate, tenantSlug);
    const { senha: _, ...safeUser } = updated;
    return safeUser;
  }

  async deleteUser(id, tenantSlug) {
    if (id === 'usr_root') {
      const err = new Error('O usuário raiz (root) do sistema não pode ser removido.');
      err.statusCode = 403;
      throw err;
    }

    const existing = await userRepository.findById(id, tenantSlug);
    if (!existing) {
      const err = new Error('Usuário não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    await userRepository.delete(id, tenantSlug);
    return { success: true, message: 'Usuário removido com sucesso.' };
  }
}

module.exports = new UserService();
