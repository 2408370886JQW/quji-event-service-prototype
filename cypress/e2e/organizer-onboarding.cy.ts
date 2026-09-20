describe("主办方首次入驻闭环", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit("/");
  });

  it("完成手机号注册 实名 主体材料并提交平台审核", () => {
    cy.contains("button", "主办方活动运营人员").click();
    cy.get('[data-cy="organizer-register"]').click();

    cy.contains("注册主办方账号").should("be.visible");
    cy.contains("手机号").parent().find("input").type("13800008821");
    cy.contains("验证码").parent().find("input").type("246810");
    cy.get('[data-cy="registration-next"]').click();

    cy.contains("经办人姓名").parent().find("input").type("林洁");
    cy.contains("身份证号").parent().find("input").type("650102199001018821");
    cy.contains("主办方主体名称")
      .parent()
      .find("input")
      .type("新疆星河文化传媒有限公司");
    cy.get('input[type="checkbox"]').check();
    cy.get('[data-cy="registration-next"]').click();

    cy.contains("账号认证与主体材料").should("be.visible");
    cy.contains("统一社会信用代码")
      .parent()
      .find("input")
      .type("91650100XXXXXXXXXX");
    cy.get('[data-cy="admission-material-license"]')
      .contains("使用公开样例")
      .click();
    cy.get('[data-cy="admission-material-authorization"]')
      .contains("使用公开样例")
      .click();
    cy.get('[data-cy="admission-material-safety"]').within(() => {
      cy.contains("安全责任人").parent().find("input").type("林洁");
      cy.contains("联系电话").parent().find("input").type("13800008821");
      cy.contains("button", "保存责任人信息").click();
    });
    cy.get('[data-cy="submit-admission"]').click();
    cy.contains("平台审核中").should("be.visible");
    cy.contains("平台运营人员可查看同一份资料").should("be.visible");
  });
});
