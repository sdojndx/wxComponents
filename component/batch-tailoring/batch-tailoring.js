// components/batch-tailoring/batch-tailoring.js
var app = getApp();
var systeminfo = wx.getSystemInfoSync()
var imageboxminh = 100;         //图片显示区最小高度
var limitnum = 1;               //最大上传数
var imagelist = [];             //canvas数据
var cutlist = [];               //选中用于生成图片的列表
var cutCreateImgs = [];         //裁剪完的图片
var basepoint = {               //裁剪区左上角在canvas的坐标
    x: 0,
    y: 0
}
var tailoringitem = "";

Component({
    /**
     * 组件的属性列表
     */
    properties: {
        imageSrc: {
            type: Array,
            value: [],
            observer: function (newVal, oldVal) {
                var images = newVal.map((item,index)=>{
                    return {
                        src:item,
                        status:0,
                        index:index+1
                    }
                });
                this.setData({
                    images,
                    selectlength:newVal.length
                },()=>{
                    setTimeout(() => {
                        this.initEditerSize(newVal);
                    }, 100)
                })
            }
        },
        ratio: {                            //比率
            type: Number,
            value:1,
            observer: function (newVal, oldVal) {
            }
        },
        limitnum:{
            type:Number,
            observer: function (newVal, oldVal){
                limitnum = newVal;
            }
        },
        imagelimit:{
            type:Number,
            value:10
        }
    },
    lifetimes:{
        ready(){
        }
    },
    /**
     * 组件的初始数据
     */
    data: {
        tailoringsize: {                //裁剪区域宽、高
            width: 0,
            height: 0
        },
        editsize: {                    //整个编辑器宽、高
            width: 0,
            height: 0
        },
        selectindex:0,
        images:[],
        selectlength:0
    },

    /**
     * 组件的方法列表
     */
    methods: {
        initEditerSize(list){
            this.createSelectorQuery().select("#editer").boundingClientRect(res=>{
                //console.log(res);
                if(res&&res.height&&res.width){
                    var editsize = {
                        width: res.width,
                        height: res.height
                    }; 
                    imageboxminh = res.width/4;
                    var tailoringsize = {};
                    var spacewidth = 0;
                    var editerratio = res.width/res.height;
                    var height = res.width/this.data.ratio;
                    if (height > res.height - imageboxminh) {
                        var h = res.height - imageboxminh;
                        var w = h * this.data.ratio;
                        tailoringsize = {
                            width: w,
                            height: h
                        };
                        basepoint = {
                            x: (res.width - w) / 2,
                            y: 0
                        }
                        spacewidth = (res.width - w) / 2;
                    } else {
                        tailoringsize = {
                            width: res.width,
                            height: height
                        };
                    }
                    this.setData({
                        tailoringsize,
                        editsize,
                        spacewidth
                    },()=>{
                        this.initImageList();                   //初始化图片列表
                    })
                }
            }).exec();
        },
        initImageList() {
            //console.log(list);
            var imgs = this.data.images;
            var imgpromise = imgs.map(item => {
                return new Promise((resolve,reject)=>{
                    wx.getImageInfo({
                        src: item.src,
                        success(res) {
                            resolve(res);
                            //console.log(res);
                        },
                        fail(res){
                            reject(res);
                        }
                    })
                })
            })
            //console.log(imgpromise);
            Promise.all(imgpromise).then(images => {
                //console.log(images);
                imagelist = images;
                this.initCanvas(0);
            })
        },
        initCanvas(ind){                       //初始化canvas
            var item = imagelist[ind];
            item.ctx = wx.createCanvasContext("canvas" + ind, this);//this.createSelectorQuery().select('.tailoring_canvas'+index);
            this.initImageSizeToFill(item);
            this.drawImageCanvas(item,()=>{
                if (ind+1 < imagelist.length){
                    this.initCanvas(ind+1);
                }
            })
            tailoringitem = imagelist[this.data.selectindex];
        },
        initImageSizeToFill(image){
            var tailoring = {};                             //图片在裁剪区域位置  x,y,width,height
            var iratio = image.width/image.height;
            var tailoringsize = this.data.tailoringsize;
            if(iratio>this.data.ratio){
                tailoring.height = tailoringsize.height;
                tailoring.width = tailoring.height*iratio;
                tailoring.x = (tailoringsize.width - tailoring.width)/2;
                tailoring.y = 0;
            } else {
                tailoring.width = tailoringsize.width;
                tailoring.height = tailoring.width/iratio; 
                tailoring.x = 0;
                tailoring.y = (tailoringsize.height - tailoring.height) / 2;
            }
            image.tailoring = tailoring;
            //return image;
        },
        initImageSizeToWhite(image){
            var tailoring = {};                             //图片在裁剪区域位置  x,y,width,height
            var iratio = image.width / image.height;
            var tailoringsize = this.data.tailoringsize;
            if (iratio > this.data.ratio) {
                tailoring.width = tailoringsize.width;
                tailoring.height = tailoring.width / iratio;
                tailoring.x = 0;
                tailoring.y = (tailoringsize.height - tailoring.height) / 2;
            } else {
                tailoring.height = tailoringsize.height;
                tailoring.width = tailoring.height * iratio;
                tailoring.x = (tailoringsize.width - tailoring.width) / 2;
                tailoring.y = 0;
            }
            image.tailoring = tailoring;
        },
        drawImageCanvas(imageitem,callback){
            if (!imageitem){
                return;
            }
            if (!imageitem.starttouch || !imageitem.starttouch.length) {                
                this.drawImageInit(imageitem);
            } else if (imageitem.starttouch.length==1){
                this.drawImageMove(imageitem);
                this.drawCover(imageitem); 
            } else if (imageitem.starttouch.length > 1){
                this.drawImageCut(imageitem);
                this.drawCover(imageitem); 
            } 
            //this.drawCover(imageitem); 
            //console.log("draw action",imageitem);
            imageitem.ctx.draw(false,function(){
                if(typeof callback=='function'){
                    callback();
                }
                //console.log("draw over",arguments);
            });
        },
        drawImageInit(imageitem) {                           //静态绘制
            var ctx = imageitem.ctx;
            var editsize = this.data.editsize;
            var tailoring = imageitem.tailoring;
            var tailoringsize = this.data.tailoringsize;
            //ctx.clearRect(0, 0, editsize.width, tailoringsize.height);
            ctx.rect(0, 0, editsize.width, tailoringsize.height);
            ctx.setFillStyle('white');
            ctx.fill();
            ctx.drawImage(imageitem.path, 0, 0, imageitem.width, imageitem.height, tailoring.x + basepoint.x, tailoring.y + basepoint.y, tailoring.width, tailoring.height);
        }, 
        drawImageMove(imageitem) {                          //计算拖动绘制
            var ctx = imageitem.ctx;
            var editsize = this.data.editsize;
            var tailoring = imageitem.tailoring;
            var tailoringsize = this.data.tailoringsize;
            var starttouch = imageitem.starttouch[0];
            var movetouch = imageitem.movetouch[0];
            var moveto = {
                x: tailoring.x + movetouch.clientX - starttouch.clientX,
                y: tailoring.y + basepoint.y + movetouch.clientY - starttouch.clientY
            }
            imageitem.moveto = moveto;
            //ctx.clearRect(0, 0, editsize.width, tailoringsize.height);
            ctx.rect(0, 0, editsize.width, tailoringsize.height);
            ctx.setFillStyle('white');
            ctx.fill();
            ctx.drawImage(imageitem.path, 0, 0, imageitem.width, imageitem.height, moveto.x + basepoint.x, moveto.y + basepoint.y, tailoring.width, tailoring.height);
            //this.drawCover(imageitem);
            //ctx.draw();
        },
        drawImageCut(imageitem) {                            //计算二指操作绘制
            var ctx = imageitem.ctx;
            var editsize = this.data.editsize;
            var tailoring = imageitem.tailoring;
            var tailoringsize = this.data.tailoringsize;
            var starttouch = imageitem.starttouch;
            var movetouch = imageitem.movetouch;
            var startpoint = {
                x: (starttouch[0].clientX + starttouch[1].clientX)/2,
                y: (starttouch[0].clientY + starttouch[1].clientY) / 2,
            }
            startpoint.size = Math.sqrt(Math.pow((starttouch[0].clientX - starttouch[1].clientX), 2) + Math.pow((starttouch[0].clientY - starttouch[1].clientY), 2));
            var endpoint = {
                x: (movetouch[0].clientX + movetouch[1].clientX) / 2,
                y: (movetouch[0].clientY + movetouch[1].clientY) / 2,
            }
            endpoint.size = Math.sqrt(Math.pow((movetouch[0].clientX - movetouch[1].clientX), 2) + Math.pow((movetouch[0].clientY - movetouch[1].clientY), 2));
            
            var changeratio = endpoint.size/startpoint.size;
            var moveto = {
                x: (tailoring.x - startpoint.x) * changeratio + endpoint.x,
                y: (tailoring.y - startpoint.y) * changeratio + endpoint.y,
                width: tailoring.width * changeratio,
                height: tailoring.height * changeratio
            }
            imageitem.moveto = moveto;

            //ctx.clearRect(0, 0, editsize.width, tailoringsize.height);
            ctx.rect(0, 0, editsize.width, tailoringsize.height);
            ctx.setFillStyle('white');
            ctx.fill();
            ctx.drawImage(imageitem.path, 0, 0, imageitem.width, imageitem.height, moveto.x + basepoint.x, moveto.y + basepoint.y, moveto.width, moveto.height);
        },
        drawCover(imageitem){                        //绘制覆层
            var ctx = imageitem.ctx;
            var editsize = this.data.editsize;
            var tailoringsize = this.data.tailoringsize;
            var starttouch = imageitem.starttouch;
            var movetouch = imageitem.movetouch;

            ctx.setStrokeStyle("rgba(255,255,255,0.5)");
            ctx.setLineWidth(1);
            var width = 0;
            if (tailoringsize.width<editsize.width){
                width = (editsize.width - tailoringsize.width)/2;
                ctx.rect(width, 0, tailoringsize.width, tailoringsize.height);
            }
            var spacew = tailoringsize.width/3;
            var spaceh = tailoringsize.height / 3; 
            ctx.moveTo(width + spacew, 0);
            ctx.lineTo(width + spacew, tailoringsize.height);
            ctx.moveTo(width + spacew * 2, 0);
            ctx.lineTo(width + spacew * 2, tailoringsize.height);
            ctx.moveTo(width, spaceh);
            ctx.lineTo(width + tailoringsize.width, spaceh);
            ctx.moveTo(width, spaceh*2);
            ctx.lineTo(width + tailoringsize.width, spaceh*2);
            ctx.stroke();
        },
        startTouch(e){                          //拖拽开始
            //console.log(e);
            if (!tailoringitem.starttouch){
                tailoringitem.starttouch = e.touches;
            }else if(tailoringitem.starttouch.length != e.touches.length) {
                this.count(tailoringitem);
                tailoringitem.starttouch = e.touches;
            }
        },
        moveTouch(e) {                           //拖拽移动
            tailoringitem.movetouch = e.touches;
            this.drawImageCanvas(tailoringitem);
        },
        endTouch(e) {                           //拖拽结束
            this.revise(tailoringitem);
            delete tailoringitem.starttouch;
            this.drawImageCanvas(tailoringitem);
        },
        count(image) {
            image.tailoring.x = image.moveto.x;
            image.tailoring.y = image.moveto.y;
            if(image.starttouch.length>1){
                image.tailoring.width = image.moveto.width;
                image.tailoring.height = image.moveto.height;
            }
        },
        revise(imageitem) {
            if (!imageitem.starttouch || !imageitem.starttouch.length || !imageitem.moveto){
                return;
            }
            var editsize = this.data.editsize;
            var tailoring = imageitem.tailoring;
            var tailoringsize = this.data.tailoringsize;
            tailoring.x = imageitem.moveto.x;
            tailoring.y = imageitem.moveto.y;
            //console.log("end", imageitem.starttouch);
            if (imageitem.starttouch.length > 1) {
                tailoring.width = imageitem.moveto.width;
                tailoring.height = imageitem.moveto.height;
            }
            var basex = tailoring.x;
            if (basex + tailoring.width<0){
                tailoring.x = Math.min(0, tailoringsize.width-tailoring.width);
            }
            if (tailoring.y + tailoring.height < 0) {
                tailoring.y = Math.min(0, tailoringsize.height - tailoring.height);
            }
            if (basex - tailoringsize.width > 0) {
                tailoring.x = Math.max(0, tailoringsize.width - tailoring.width);
            }
            if (tailoring.y - tailoringsize.height > 0) {
                tailoring.y = Math.max(0, tailoringsize.height - tailoring.height);
            }

        },
        changeStatus(e){
            var index = this.data.selectindex;
            var images = this.data.images;
            if (images[index].status==0){
                images[index].status = 1;
                this.initImageSizeToWhite(tailoringitem);
            }else{
                images[index].status = 0;
                this.initImageSizeToFill(tailoringitem);
            }
            this.drawImageCanvas(tailoringitem);
            this.setData({
                images
            })
        },
        selectImg(e){
            var index = e.currentTarget.dataset.index;
            tailoringitem = imagelist[index];
            this.setData({
                selectindex:index
            })
        },
        chooseImg(e){
            console.log(this.data,imagelist);
            var index = e.currentTarget.dataset.index;
            var images = this.data.images;
            var image = images[index];
            var selectlength = this.data.selectlength;
            if(image.index===""){
                selectlength++;
                image.index = selectlength;
            }else{
                selectlength--;
                var orgindex = image.index;
                image.index = "";
                images.map(item=>{
                    if(item.index>orgindex){
                        item.index--;
                    }
                })
            }
            this.setData({
                images,
                selectlength
            })
        },
        addImage(){
            var count = this.data.imagelimit - imagelist.length;
            if(count>0){
                wx.chooseImage({
                    count: count, // 默认9
                    success:  (res) => {
                        var paths = res.tempFilePaths;
                        var images = this.data.images;
                        var l = images.length;
                        var selectlength = this.data.selectlength;
                        var newimages = paths.map((item,index) => {
                            return {
                                src: item,
                                status: 0,
                                index: selectlength+index+1
                            }
                        });
                        images = images.concat(newimages);
                        this.setData({
                            images,
                            selectlength: selectlength+paths.length
                        }, () => {
                            var imgpromise = newimages.map(item => {
                                return new Promise((resolve, reject) => {
                                    wx.getImageInfo({
                                        src: item.src,
                                        success(res) {
                                            resolve(res);
                                            //console.log(res);
                                        },
                                        fail(res) {
                                            reject(res);
                                        }
                                    })
                                })
                            })
                            Promise.all(imgpromise).then(imgs => {
                                imagelist = imagelist.concat(imgs);
                                this.initCanvas(l);
                            })
                        })
                    }
                });
            }else{
                wx.showToast({
                    title: '不能上传更多图片了',
                    icon:"none"
                })
            }
        },
        subImg(e) {
            cutlist = new Array(this.data.selectlength);
            this.data.images.map((item, index) => {
                if (item.index) {
                    cutlist[item.index] = imagelist[index];
                    cutlist[item.index].canvasId = "canvas" + index;
                }
            })
            cutCreateImgs = [];
            this.createImg(0);
        },
        createImg(ind) {
            ind++;
            var item = cutlist[ind];
            var tailoringsize = this.data.tailoringsize;
            
            wx.canvasToTempFilePath({
                canvasId: item.canvasId,
                x: basepoint.x,
                y: basepoint.y,
                width: tailoringsize.width,
                height: tailoringsize.height,
                destWidth: tailoringsize.width,
                destHeight: tailoringsize.height,
                quality: 0.8,
                fileType: 'jpg',
                success: (res) => {
                    cutCreateImgs.push(res.tempFilePath);
                    wx.showLoading({
                        title: '图片生成 ' + cutCreateImgs.length + '/' + this.data.selectlength,
                        mask: true
                    })
                    if (ind < cutlist.length-1) {
                        this.createImg(ind);
                    } else {
                        this.triggerEvent("createimg", cutCreateImgs);
                        wx.hideLoading();
                    }
                }
            },this);
        }
    }
})
