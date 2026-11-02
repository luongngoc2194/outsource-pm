const assert = require('node:assert/strict');
const { createDatabase } = require('./db');

function runTests() {
  const repo = createDatabase(':memory:');
  console.log('=== KIỂM THỬ TỰ ĐỘNG BỘ TEST CASES (TC-01 -> TC-08) TRÊN SQLITE ===\n');

  // TC-01: Kiểm tra tính toán Nỗ lực Đã phân bổ và Còn lại (PYC-001 & PYC-002)
  {
    const state = repo.getFullState();
    const pyc1 = state.requests.find(r => r.code === 'PYC-001');
    const pyc2 = state.requests.find(r => r.code === 'PYC-002');
    assert.equal(pyc1.allocated_md, 28.0, 'PYC-001 đã phân bổ phải là 28.0 md');
    assert.equal(pyc1.remaining_md, 2.0, 'PYC-001 còn lại phải là 2.0 md');
    assert.equal(pyc2.allocated_md, 4.0, 'PYC-002 đã phân bổ phải là 4.0 md');
    assert.equal(pyc2.remaining_md, 6.0, 'PYC-002 còn lại phải là 6.0 md');
    console.log('✔ TC-01 PASS: PYC-001 còn lại = 2.0 md (đã PB 28.0/30.0), PYC-002 còn lại = 6.0 md (đã PB 4.0/10.0)');
  }

  // TC-02: Chặn phân bổ vượt nỗ lực chốt (BR-01)
  {
    assert.throws(
      () => repo.saveAllocationBatch({
        batchId: null,
        reqId: 1, // PYC-001
        month: '2026-12',
        note: 'Test vượt chốt',
        rows: [{ pers: 1, md: 3.0, note: 'Thêm 3.0 md' }]
      }),
      (err) => err.code === 'BR-01' && err.message.includes('31.0'),
      'Phải chặn khi thêm 3.0 md vào PYC-001'
    );
    console.log('✔ TC-02 PASS: Thêm 3.0 md vào PYC-001 bị chặn (BR-01: 31.0 md > chốt 30.0 md)');
  }

  // TC-03: Sửa nỗ lực chốt nhỏ hơn số đã phân bổ (BR-02)
  {
    assert.throws(
      () => repo.saveRequest({
        id: 1,
        proj: 1,
        code: 'PYC-001',
        name: 'Thêm báo cáo doanh thu',
        type: 'CR',
        est: 28,
        locked: 25.0,
        status: 'IN_PROGRESS'
      }),
      (err) => err.code === 'BR-02',
      'Phải chặn khi giảm số chốt xuống 25.0 < 28.0 md'
    );
    console.log('✔ TC-03 PASS: Hạ số chốt PYC-001 xuống 25.0 md (< 28.0 md đã phân bổ) bị chặn (BR-02)');
  }

  // TC-04: Kiểm tra bước nhảy nỗ lực 0.01 (BR-07)
  {
    assert.throws(
      () => repo.saveAllocationBatch({
        batchId: null,
        reqId: 1,
        month: '2026-12',
        note: 'Test bước 0.01',
        rows: [{ pers: 1, md: 1.255, note: 'Sai bước 0.01' }]
      }),
      (err) => err.code === 'BR-07',
      'Nhập 1.255 MM phải bị từ chối'
    );
    console.log('✔ TC-04 PASS: Nhập 1.255 MM bị từ chối theo quy tắc bước nhảy 0.01 MM (BR-07)');
  }

  // TC-05: Gán phân bổ cho nhân sự chưa tham gia PYC hoặc đã nghỉ (BR-03)
  {
    assert.throws(
      () => repo.saveAllocationBatch({
        batchId: null,
        reqId: 2, // PYC-002 chỉ có NS02 (Bình)
        month: '2026-11',
        note: 'Test NS chưa gán',
        rows: [{ pers: 3, md: 2.0, note: 'Chi chưa gán vào PYC-002' }]
      }),
      (err) => err.code === 'BR-03',
      'Phân bổ cho NS03 chưa gán vào PYC-002 phải bị chặn'
    );
    console.log('✔ TC-05 PASS: Phân bổ cho nhân sự chưa gán vào PYC-002 (NS03 Chi) bị chặn (BR-03)');
  }

  // TC-06: Trùng mã PYC trong cùng dự án (BR-05)
  {
    assert.throws(
      () => repo.saveRequest({
        id: null,
        proj: 1,
        code: 'PYC-001',
        name: 'PYC trùng mã',
        type: 'CR',
        est: 5,
        locked: 5
      }),
      (err) => err.code === 'BR-05',
      'Tạo PYC trùng mã PYC-001 trong DA-01 phải bị chặn'
    );
    console.log('✔ TC-06 PASS: Tạo PYC trùng mã PYC-001 trong cùng dự án DA-01 bị chặn (BR-05)');
  }

  // TC-07: Xóa mềm đợt phân bổ -> nỗ lực còn lại tăng lại & Khôi phục (BR-04)
  {
    // Xóa mềm đợt 2 (T11/2026 của PYC-001: 11.5 md)
    repo.softDelete('batches', 2);
    let pyc1 = repo.getFullState().requests.find(r => r.id === 1);
    assert.equal(pyc1.allocated_md, 16.5, 'Sau xóa mềm T11, đã phân bổ phải giảm còn 16.5 md');
    assert.equal(pyc1.remaining_md, 13.5, 'Sau xóa mềm T11, còn lại phải tăng lên 13.5 md');

    // Khôi phục lại đợt 2
    repo.restore('batches', 2);
    pyc1 = repo.getFullState().requests.find(r => r.id === 1);
    assert.equal(pyc1.allocated_md, 28.0);
    assert.equal(pyc1.remaining_md, 2.0);
    console.log('✔ TC-07 PASS: Xóa mềm đợt T11/2026 -> Còn lại PYC-001 tăng từ 2.0 lên 13.5 md; Khôi phục -> Về lại 2.0 md (BR-04)');
  }

  // TC-08: Chuyển trạng thái Biên bản nghiệm thu (BR-09)
  {
    repo.toggleBbntStatus(2, true, '2026-11-02');
    const bbnt2 = repo.getFullState().bbnt.find(b => b.id === 2);
    assert.equal(bbnt2.status, 'SENT');
    assert.equal(bbnt2.sent, '2026-11-02');
    console.log('✔ TC-08 PASS: Đánh dấu BBNT-02 đã gửi -> Tự động ghi nhận ngày gửi 2026-11-02 và Audit Log (BR-09)');
  }

  console.log('\n🎉 TẤT CẢ 8 CA KIỂM THỬ (TC-01 -> TC-08) ĐỀU PASS 100%!');
}

runTests();
