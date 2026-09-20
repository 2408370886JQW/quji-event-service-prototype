const login = () => {
  cy.visit('/')
  cy.contains('button', '进入协同平台').click()
  cy.contains('button', '当前活动档案').should('be.visible')
}

const openActivityMaterials = () => {
  cy.contains('button', '当前活动档案').click()
  cy.contains('button', '活动资料').click()
  cy.contains('h2', '活动备案与安全协同材料').should('be.visible')
}

describe('活动资料界面回归', () => {
  beforeEach(() => {
    cy.viewport(1440, 900)
  })

  it('侧栏品牌区底线与顶部横条保持同一基线', () => {
    login()
    cy.get('[data-cy="sidebar-brand"]').then(($brand) => {
      cy.get('[data-cy="workspace-topbar"]').then(($topbar) => {
        const brandBottom = $brand[0].getBoundingClientRect().bottom
        const topbarBottom = $topbar[0].getBoundingClientRect().bottom
        expect(Math.abs(brandBottom - topbarBottom)).to.be.lessThan(1)
      })
    })
  })

  it('活动材料说明按完整句意断行且不保留中文标点', () => {
    login()
    openActivityMaterials()
    cy.contains('不同活动的受理机关与清单可能不同 请以属地当前要求为准').should('be.visible')
    cy.contains('请在活动所在地有管辖权机关公布的当前清单下补充材料并留存回执').should(
      'be.visible',
    )
    cy.contains('不同活动的受理机关与清单可能不同，请以属地当前要求为准').should('not.exist')
  })

  it('每一项活动材料均可查看详情并继续上传', () => {
    login()
    openActivityMaterials()
    cy.contains('button', '上传活动材料').click()
    cy.contains('[data-cy="material-option"]', '安全工作方案').click()
    cy.get('[data-cy="material-details"]').within(() => {
      cy.contains('安全工作方案').should('be.visible')
      cy.contains('当前文件').should('be.visible')
      cy.contains('安全工作方案_2026版.pdf').should('be.visible')
      cy.contains('林洁').should('be.visible')
    })
    cy.contains('button', '下一步').click()
    cy.contains('上传 安全工作方案').should('be.visible')
  })

  it('任务处理标题、字段内容和时间记录统一靠左对齐', () => {
    login()
    cy.contains('button', '数字档案').click()
    cy.contains('button', '查看').first().click()
    cy.get('[data-cy="task-drawer"]').should('be.visible')
    cy.get('[data-cy="task-drawer"]').then(($drawer) => {
      const expectedLeft = $drawer[0].getBoundingClientRect().left + 24
      cy.get('[data-cy="task-heading"]').then(($heading) => {
        expect(Math.abs($heading[0].getBoundingClientRect().left - expectedLeft)).to.be.lessThan(1)
      })
      cy.get('.task-field__value').each(($value) => {
        expect(Math.abs($value[0].getBoundingClientRect().left - expectedLeft - 16)).to.be.lessThan(1)
        expect($value.text()).not.to.match(/[，。；、·]/)
      })
    })
    cy.get('.timeline-row').each(($row) => {
      const texts = $row.find('div > div')
      expect(texts.length).to.be.greaterThan(1)
    })
  })
})
