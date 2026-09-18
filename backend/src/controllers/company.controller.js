const companyRepository = require('../repositories/companyRepository');

class CompanyController {
  async getCompany(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const company = await companyRepository.getCompany(tenantSlug);
      return res.json(company);
    } catch (err) {
      next(err);
    }
  }

  async getPublicInfo(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const company = await companyRepository.getCompany(tenantSlug);
      return res.json({
        razaoSocial: company.razaoSocial || '',
        nomeFantasia: company.nomeFantasia || '',
        logoBase64: company.logoBase64 || '',
        tenantSlug: tenantSlug
      });
    } catch (err) {
      next(err);
    }
  }

  async updateCompany(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const updated = await companyRepository.updateCompany(req.body, tenantSlug);
      return res.json(updated);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CompanyController();
