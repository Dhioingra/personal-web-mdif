//------ GET CONNECTION
const express = require('express')
const { handlebars } = require('hbs')
const db = require('./connection/db')
const bcrypt = require ('bcrypt')
const session = require ('express-session')
const flash = require ('express-flash')
const upload = require ('./middlewares/uploadFile')

const app = express()
const port = process.env.PORT || 3000
let isLogin = true

app.set('view engine', "hbs") //set tampel engine
app.use('/public',express.static(__dirname+'/public')) //set public folder/path
app.use('/uploads',express.static(__dirname+'/uploads')) //set uploads folder/path
app.use(express.urlencoded({extended : false}))
app.use(
    session({
        cookie : {
            maxAge : 2 * 60 * 60 * 1000,
            secure : false,
            httpOnly : true
        },
        store : new session.MemoryStore(),
        saveUninitialized : true,
        resave : false,
        secret : "secretValue"
    })
)
app.use(flash())


//------ HANDLEBARS HELPER
handlebars.registerHelper("getTime", function(time){
    let month = ["January","February","March","April","May","June","July","August","September","October","November","December"]

    let date = time.getDate()
    let monthIndex = time.getMonth()
    let year = time.getFullYear()
    let hours = time.getHours()
    let minute = time.getMinutes()

    let result = `${date} ${month[monthIndex]} ${year} ${hours}:${minute} WITA`
    return result
})


handlebars.registerHelper("getDistance", function(time){
    let timePost = time
    let timeNow = new Date ()

    let distanceTime = timeNow - timePost
    
    let milisecond = 1000;
    let secondInMinute = 60;
    let minutesInHour = 60;
    let hoursInDay = 23;

    let distanceDays = Math.floor(distanceTime / (milisecond*secondInMinute*minutesInHour*hoursInDay))

    if(distanceDays >= 1){
        return (`${distanceDays} Days ago`)
    }else{
        let distanceHours = Math.floor(distanceTime / (milisecond*secondInMinute*minutesInHour))
        if(distanceHours >=1){
            return (`${distanceHours} Hours ago`)
        }else{
            let distanceMinutes = Math.floor(distanceTime / (milisecond*secondInMinute))
            if(distanceMinutes >=1){
                return (`${distanceMinutes} Minutes ago`)
            }else{
                let distanceSeconds = Math.floor(distanceTime / milisecond)
                return (`${distanceSeconds} Seconds ago`)
            }
        }
    
    }
})


//------- GET ROUTE
app.get('/', function(req,res){

    db.connect(function(err,client){
        if (err) throw err

        client.query(`SELECT * FROM public.experience`, function (err,result){
            if (err) throw err
            let data = result.rows

            res.render("index", {experience : data,
                isLogin : req.session.isLogin,
                blogs : data,
                user : req.session.user})
        })
    })
})

app.get('/blog-detail', function (req,res){
    
    db.connect(function(err,client){
        if (err) throw err

        client.query(`SELECT blog.id, blog.title, blog.content, blog.image, tb_user.name 
                        AS author, blog.author_id, blog."postAt" 
                        FROM blog LEFT JOIN tb_user 
                        ON blog.author_id = tb_user.id 
                        ORDER BY blog.id`, function (err,result){
            if (err) throw err
            let data = result.rows

            data = data.map(function(blog){
                return {
                    ...blog,
                    isLogin : req.session.isLogin,
                    image : '/uploads/'+blog.image
                }
            })
            

            res.render("blog-detail", {
                isLogin : req.session.isLogin,
                blogs : data,
                user : req.session.user})
        })
    })
    
})

app.get('/delete-blog/:id', function (req,res){
    let id = req.params.id
    
    db.connect(function(err,client){
        if (err) throw err
        

        client.query(`DELETE FROM public.blog WHERE id=${id}`, function (err,result){
            if (err) throw err

            res.redirect('/blog-detail')
        })
    })
})

app.get('/blog/:id', function(req,res){
    let id = req.params.id

    db.connect(function(err,client){
        if (err) throw err

        client.query(`SELECT * FROM blog WHERE id=${id}`, function (err,result){
            if (err) throw err
            let data = result.rows
            

            data = data.map(function(blog){
                return {
                    ...blog,
                    postAt : getFullTime(blog.postAt),
                    isLogin : req.session.isLogin,
                    image : '/uploads/'+blog.image
                }
            })
            console.log(data[0])

            res.render("blog", {id:id,
                isLogin : req.session.isLogin,
                blogs : data[0],
                user : req.session.user})
        })
    })
})

app.get('/add-blog', function(req,res){
    res.render("add-blog",{
        isLogin : req.session.isLogin,
        user : req.session.user})
})

app.get('/register', function(req,res){
    res.render("register", {isLogin : isLogin,
        isLogin : req.session.isLogin,
        user : req.session.user})
})

app.get('/login', function(req,res){
    res.render("login",{
        isLogin : req.session.isLogin,
        user : req.session.user})
})

app.get('/edit-blog/:id', function (req,res){
    let id = req.params.id

    res.render("edit-blog", {id,
        isLogin : req.session.isLogin,
        user : req.session.user})
})

app.get('/contact-me', function(req,res){

    if(!req.session.isLogin ){
        req.flash('danger', 'Please login to contact..')
    }

    res.render("form", {
        isLogin : req.session.isLogin,
        user : req.session.user})
})

app.get('/logout', function(req,res){
    req.session.destroy()
    res.redirect('/login')
})


//------- POST ROUTE
app.post('/add-blog', upload.single('image'), function (req,res){

    
    
    if(!req.session.isLogin ){
        req.flash('danger', 'Please login..')
        return res.redirect('/login')
    }
    let authorId = req.session.user.id
    

    let image = req.file.filename
    

    let data = {
        author : req.body.author,
        title : req.body.title,
        content : req.body.content,
        postAt : new Date()
    }
    console.log(authorId)
    db.connect(function(err,client){
        if (err) throw err
        

        client.query(`INSERT INTO blog(title, content, author, author_id, image) VALUES ('${data.title}', '${data.content}', '${data.author}', ${authorId}, '${image}')`, function (err,result){
            if (err) throw err

            res.redirect('/blog-detail')
        })
    })
})

app.post('/register', function(req,res){
   
    const {name, email, password} = req.body
    console.log(email)

    const hashedPassword = bcrypt.hashSync(password, 10)

    db.connect(function(err,client){
        if (err) throw err
        
        client.query(`SELECT * FROM tb_user WHERE email='${email}'`, function (err,result){
            if(result.rows.length >= 1){
                req.flash('danger', 'Email has been registered..')
                return res.redirect('/register')
            }else{
                client.query(`INSERT INTO tb_user (name, password, email) VALUES ('${name}', '${hashedPassword}', '${email}')`, function (err,result){
                    if (err) throw err
                    req.flash('success', 'Register success')
                    res.redirect('/login')
                })
            }
        })
    })
})

app.post('/login', function(req,res){
    const {email, password} = req.body

    if (email == "" || password == ""){
        req.flash('danger', 'Insert email and password..')
        return res.redirect('/login')
    }

    db.connect(function(err,client){
        if (err) throw err
        

        client.query(`SELECT * FROM tb_user WHERE email='${email}'`, function (err,result){
            if (err) throw err

            if(result.rows.length == 0){
                req.flash('danger', 'Email and Password don\'t match')
                return res.redirect('/login')
            }

        let isMatch = bcrypt.compareSync(password, result.rows[0].password)

        if(isMatch === true){
            req.session.isLogin = true
            req.session.user = {
                id : result.rows[0].id,
                name : result.rows[0].name,
                email : result.rows[0].email
            }
            req.flash('success', `Login Success, Welcome ${result.rows[0].name}`)
            
            res.redirect('/blog-detail')
        }else{
            req.flash('danger', 'Email and Password don\'t match!')

            res.redirect('/login')
        }
        })
    })

})

app.post('/edit-blog/:id', upload.single('image') , function (req,res){
    
    let data = {
        author : req.body.author,
        title : req.body.title,
        content : req.body.content,
        postAt : new Date()
    }
    let image = req.file.filename

    db.connect(function(err,client){
        let id = req.params.id
        if (err) throw err

        client.query(`UPDATE blog SET title='${data.title}', content='${data.content}', author='${data.author}', image='${image}' WHERE id=${id}`, function (err,result){
            if (err) throw err

            res.redirect('/blog-detail')
        })
    })
})

app.post('/contact-me', function(req,res){
    res.redirect('/contact-me')
})


//-------- LISTEN PORT
app.listen(port,function(){
    console.log(`Server start on PORT : ${port}`)
});


//-------- Upload's Time --------//
function getFullTime (time){
    let month = ["January","February","March","April","May","June","July","August","September","October","November","December"]

    let date = time.getDate()
    let monthIndex = time.getMonth()
    let year = time.getFullYear()
    let hours = time.getHours()
    let minute = time.getMinutes()

    let result = `${date} ${month[monthIndex]} ${year} ${hours}:${minute} WITA`
    return result
}

//-------- Distance Upload's Time --------//
function getDistanceTime (time){
    let timePost = time
    let timeNow = new Date ()

    let distanceTime = timeNow - timePost
    
    let milisecond = 1000;
    let secondInMinute = 60;
    let minutesInHour = 60;
    let hoursInDay = 23;

    let distanceDays = Math.floor(distanceTime / (milisecond*secondInMinute*minutesInHour*hoursInDay))

    if(distanceDays >= 1){
        return (`${distanceDays} Days ago`)
    }else{
        let distanceHours = Math.floor(distanceTime / (milisecond*secondInMinute*minutesInHour))
        if(distanceHours >=1){
            return (`${distanceHours} Hours ago`)
        }else{
            let distanceMinutes = Math.floor(distanceTime / (milisecond*secondInMinute))
            if(distanceMinutes >=1){
                return (`${distanceMinutes} Minutes ago`)
            }else{
                let distanceSeconds = Math.floor(distanceTime / milisecond)
                return (`${distanceSeconds} Seconds ago`)
            }
        }
    
    }
}