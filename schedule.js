const express = require('express');
const router = express.Router();
const authJWT = require('./middleware/authJWT');
const crypto = require('crypto');
var mysql = require('mysql2/promise');

var db = mysql.createPool({
    host: process.env.mysql_host,
    port: process.env.mysql_port,
    user: process.env.mysql_user,
    password: process.env.mysql_password,
    database: process.env.mysql_database,
    connectionLimit: 10,
    connectTimeout: 10000
});

// create schedule : post 
router.post('/', authJWT, async(req, res)=>{
    let conn = null;
    const sch = req.body;
    var string = req.body.member_id.substr(1, req.body.member_id.length-2);
    try{
        // proj member add 
        // user Transaction
        const query = `select Exists(select * from ProjectMember where user_id = ${req.user_id} and proj_id = ${sch.proj_id}) as success`;
        const query1 = `insert into Schedule(proj_id, sch_title, sch_num, sch_contents, sch_progress, sch_startAt, sch_endAt)
        select proj_id, ${sch.sch_title}, ${0}, ${sch.sch_contents}, ${sch.sch_progress}, ${sch.startAt}, ${sch.endAt} from Project where proj_id = ${sch.proj_id}`;
        const query2 = `select sch_id, proj_id from Schedule where proj_id = ${sch.proj_id} and sch_title = ${sch.sch_title}`;
        conn = await db.getConnection();
        // start Transaction
        await conn.beginTransaction();
        const [result2] = await conn.query(query);
        if(result2[0].success == 0)throw Error('No authorized!'); // 다른 proj에 대한 권한이 없다
        const [result1] = await conn.query(query2);
        if(result1[0] != null)throw Error('already exist!');
        await conn.query(query1);
        const [result] = await conn.query(query2);
        const query3 = `insert into ScheduleMember(user_id, sch_id, proj_id) select user_id, sch_id, a.proj_id
        from (select * from ProjectMember where user_id in (${string})) 
        as a join (select sch_id, proj_id from Schedule where proj_id = ${sch.proj_id}) as b on a.proj_id = b.proj_id where sch_id = ${result[0].sch_id};`;
        await conn.query(query3);
        if(result[0] == null)throw Error('no update!');
        await conn.commit();
        conn.release();
        return res.status(200).send({
            ok: true,
            statuscode: 200,
            message: 'create schedule success',
            data: result,
        });
    }catch(err){
        if(conn!=null){
            await conn.rollback();
            conn.release();
        }
        return res.status(400).send({
            ok: false,
            statuscode: 400,
            message: 'create schedule fail',
            submessage: err.message,
        });
    }
})

router.post('/static', authJWT, async(req, res)=>{
    let conn = null;
    const sch = req.body;
    try{
        // proj member add 
        // user Transaction
        const query = `select Exists(select * from ProjectMember where user_id = ${req.user_id} and proj_id = ${sch.proj_id}) as success`;
        const query1 = `insert into Schedule(proj_id, sch_title, sch_num, sch_contents, sch_progress, sch_startAt, sch_endAt)
        select proj_id, ${sch.sch_title}, ${sch.sch_num}, ${sch.sch_contents}, ${sch.sch_progress}, ${sch.startAt}, ${sch.endAt} from Project where proj_id = ${sch.proj_id}`;
        const query2 = `select sch_id, proj_id from Schedule where proj_id = ${sch.proj_id} and sch_title = ${sch.sch_title}`;
        conn = await db.getConnection();
        // start Transaction
        await conn.beginTransaction();
        const [result2] = await conn.query(query);
        if(result2[0].success == 0)throw Error('No authorized!'); // 다른 proj에 대한 권한이 없다
        const [result1] = await conn.query(query2);
        if(result1[0] != null)throw Error('already exist!');
        await conn.query(query1);
        const [result] = await conn.query(query2);
        // const query3 = `insert into ScheduleMember(user_id, sch_id, proj_id) select user_id, sch_id, a.proj_id
        // from (select * from ProjectMember where user_id in (${string})) 
        // as a join (select sch_id, proj_id from Schedule where proj_id = ${sch.proj_id}) as b on a.proj_id = b.proj_id where sch_id = ${result[0].sch_id};`;
        const query3 = `insert into ScheduleMember(user_id, sch_id, proj_id) select user_id, sch_id, a.proj_id
        from (select * from ProjectMember where user_id = ${req.user_id}) 
        as a join (select sch_id, proj_id from Schedule where proj_id = ${sch.proj_id}) as b on a.proj_id = b.proj_id where sch_id = ${result[0].sch_id};`;
        await conn.query(query3);
        if(result[0] == null)throw Error('no update!');
        await conn.commit();
        conn.release();
        return res.status(200).send({
            ok: true,
            code: 200,
            message: 'create schedule success',
            data: result,
        });
    }catch(err){
        if(conn!=null){
            await conn.rollback();
            conn.release();
        }
        res.status(500).send({
            ok: false,
            code: 500,
            message: 'create schedule fail',
            submessage: err.message,
        });
    }
})

// delete schedule
router.delete('/', authJWT, async(req, res)=>{
    let conn = null;
    try{
        // user Transaction
        const query1 = `delete from ScheduleMember where sch_id = ${req.body.sch_id}`;
        const query2 = `select Exists(select * from ScheduleMember where sch_id = ${req.body.sch_id}) as success`;
        conn = await db.getConnection();
        // start Transaction
        await conn.beginTransaction();
        await conn.query(query1);
        const [result] = await conn.query(query2);
        if(result[0].success != 0)throw Error("delete error!");
        // End Transaction
        await conn.commit();
        conn.release();
        return res.status(200).send({
            ok: true,
            statuscode: 200,
            message: 'delete Schedule success',
            data: result,
        });
    }catch(err){
        if(conn!=null){
            await conn.rollback();
            conn.release();
        }
        console.log('get user DB connection Error!');
        return res.status(400).send({
            ok: false,
            statuscode: 400,
            message: 'create schedule fail',
            submessage: err.message,
        });
    }
})

// change shedule
router.put('/', authJWT, async(req, res)=>{
    let conn = null;
    const sch = req.body;
    try{
        // proj member add 
        const users = req.body.proj_member;
        // user Transaction
        const query1 = `select Exists(select * from ScheduleMember where sch_id = ${sch.sch_id} and proj_id = ${sch.proj_id} and user_id = ${req.user_id}) as success`;
        const query2 = `update Schedule set sch_title = ${sch.sch_title}, sch_contents = ${sch.sch_contents}, sch_progress = ${sch.sch_progress}, 
        sch_endAt = ${sch.endAt} where sch_id = ${sch.sch_id} and proj_id = ${sch.proj_id}`;
        conn = await db.getConnection();
        // start Transaction
        await conn.beginTransaction();
        const [result] = await conn.query(query1);
        if(result[0].success == 0)throw Error('Not exist data!');
        await conn.query(query2);
        await conn.commit();
        conn.release();
        return res.status(200).send({
            ok: true,
            statuscode: 200,
            message: 'update schedule success',
        });
    }catch(err){
        if(conn!=null){
            await conn.rollback();
            conn.release();
        }
        return res.status(400).send({
            ok: false,
            statuscode: 400,
            message: 'update schedule fail',
        });
    }
});

router.post('/member', authJWT, async(req, res)=>{
    let conn = null;
    const sch = req.body;
    try{
        // proj member add 
        var string = req.body.member_id.substr(1, req.body.member_id.length-2);
        // user Transaction
        const query1 = `select Exists(select * from ScheduleMember where user_id in (${string}) and sch_id = ${req.body.sch_id}) as success`;
        const query2 = `insert into ScheduleMember(user_id, sch_id, proj_id) select user_id, sch_id, a.proj_id
        from (select * from ProjectMember where user_id in (${string})) 
        as a join (select sch_id, proj_id from Schedule where proj_id = ${sch.proj_id}) as b on a.proj_id = b.proj_id where sch_id = ${sch.sch_id};`;
        conn = await db.getConnection();
        // start Transaction
        await conn.beginTransaction();
        const [result1] = await conn.query(query1);
        if(result1[0].success != 0)throw Error(' already exist!');
        await conn.query(query2);
        const [result2] = await conn.query(query1);
        if(result2[0].success == 0)throw Error('');
        await conn.commit();
        conn.release();
        return res.status(200).send({
            ok: true,
            statuscode: 200,
            message: 'create schedule member success',
        });
    }catch(err){
        if(conn!=null){
            await conn.rollback();
            conn.release();
        }
        return res.status(500).send({
            ok: true,
            statuscode: 500,
            message: 'create schedule member fail',
            submessage: err.message,
        });
    }
})

router.delete('/member', authJWT, async(req, res)=>{
    let conn = null;
    try{
        const string = req.body.member_id.substr(1, req.body.member_id.length-2);
        console.log(string);
        const query1 = `select Exists(select * from ScheduleMember where user_id = ${req.user_id} and sch_id = ${req.body.sch_id}) as success`
        const query2 = `delete from ScheduleMember where user_id in (${string}) and sch_id = ${req.body.sch_id}`;
        conn = await db.getConnection();
        // start Transaction
        await conn.beginTransaction();
        console.log(query1);
        console.log(query2);
        const [result_value] = await conn.query(query1);
        if(result_value[0].success == 0)throw Error('no authorization');
        await conn.query(query2);
        await conn.commit();
        conn.release();
        return res.status(200).send({
            isSuccess: true,
            statuscode: 200,
            message: "Member delete complete!",
        });
    }catch(err){
        if(conn!=null){
            await conn.rollback();
            conn.release();
        }
        return res.status(400).send({
            isSuccess: false,
            statuscode: 400,
            message: "member delete fail!",
        });
    }
})

// check schedule member
router.get('/member/:projid/:schid', async(req, res)=>{
    let conn = null;
    try{
        const query1 = `select Exists(select * from Schedule where proj_id = ${req.params.projid} and sch_id = ${req.params.schid}) as success`
        const query2 = `select ProjectMember.user_id, user_name, user_email
        from ScheduleMember join ProjectMember on ScheduleMember.user_id = ProjectMember.user_id and ScheduleMember.proj_id = ProjectMember.proj_id
        where ScheduleMember.sch_id = ${req.params.schid}`;
        conn = await db.getConnection();
        // start Transactions
        await conn.beginTransaction();
        const [result1] = await conn.query(query1);
        if(result1[0].succcess == 0)throw Error('No authorized!');
        const [result] = await conn.query(query2);
        await conn.commit();
        conn.release();
        return res.status(200).send({
            isSuccess: true,
            statuscode: 200,
            data:{
                result,
            } 
        });
    }catch(err){
        if(conn != null){
            await conn.rollback();
            conn.release();
        }
        return res.status(401).send({
            isSuccess: false,
            statuscode: 401,
            data:{
                message: '특정 Project의 Schedule 보기 실패',
            }
        });
    }
});

// check myschedule
router.get('/my', authJWT, async(req, res)=>{
    let conn = null;
    try{
        const query1 = `select proj_id, proj_color from ProjectMember where user_id = ${req.user_id} order by proj_color asc`;
        const query2 = `select s.sch_id, s.proj_id, s.sch_title, sch_num, sch_contents, sch_progress,
        date_format(sch_startAt, '%Y-%m-%d') as startAt, date_format(sch_endAt, '%Y-%m-%d') as endAt
        from Schedule as s join (select * from ScheduleMember where user_id = ${req.user_id}) as sm on s.proj_id = sm.proj_id and s.sch_id = sm.sch_id;`;
        conn = await db.getConnection();
        await conn.beginTransaction();
        const [result1] = await conn.query(query1);
        const [result2] = await conn.query(query2);
        const result = new Array();
        if(result2.length != 0 && result1.length != 0){
            for(let i in result1){
                for(let j in result2){
                    console.log(result1[i].proj_id,  result2[j].proj_id, result2[j].sch_id);
                    if(result1[i].proj_id == result2[j].proj_id){
                        result.push(Object.assign(result2[j], result1[i]));
                    }
                }
            }
        }else{
            result = result2;
        }
        await conn.commit();
        conn.release();
        return res.status(200).send({
            isSuccess: true,
            statuscode: 200,
            data:{
                result,
            } 
        });
    }catch(err){
        if(conn != null){
            await conn.rollback();
            conn.release();
        }
        return res.status(401).send({
            isSuccess: false,
            statuscode: 401,
            data:{
                message: 'My Project 보기 실패',
            }
        });
    }
});

router.get('/project/:projid', async(req, res)=>{
    let conn = null;
    try{
        const query1 = `select Exists(select * from Project where proj_id = ${req.params.projid})as success`;
        const query2 = `select sch_id, proj_id, sch_title, sch_contents, sch_progress, date_format(sch_startAt, '%Y-%m-%d') as startAt, date_format(sch_endAt, '%Y-%m-%d') as endAt
        from Schedule where proj_id = ${req.params.projid};`
        conn = await db.getConnection();
        await conn.beginTransaction();
        const [result1] = await conn.query(query1);
        if(result1[0].success == 0)throw Error('Wrong proj_id');
        const [result] = await conn.query(query2);
        await conn.commit();
        conn.release();
        return res.status(200).send({
            isSuccess: true,
            statuscode: 200,
            data:{
                result,
            } 
        });
    }catch(err){
        if(conn != null){
            await conn.rollback;
            conn.release();
        }
        return res.status(401).send({
            isSuccess: false,
            statuscode: 401,
            data:{
                message: 'Project 일정 보기 실패',
                submessage: err.message,
            }
        });
    }
});


module.exports = router;